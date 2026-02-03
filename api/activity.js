import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

const REDIS_KEY_PREFIX = 'current-activity';
const SUPPORTED_DEVICES = ['PC', 'Phone', 'Tablet', 'Music'];

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        return res.status(200).set(corsHeaders).end();
    }

    Object.entries(corsHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
    });

    try {
        if (req.method === 'GET') {
            // Get all devices data
            const devices = {};

            for (const device of SUPPORTED_DEVICES) {
                const rawData = await redis.get(`${REDIS_KEY_PREFIX}:${device}`);
                if (rawData) {
                    devices[device] = JSON.parse(rawData);
                } else {
                    devices[device] = { app: 'Offline', updatedAt: null };
                }
            }

            return res.status(200).json({ devices });
        }

        if (req.method === 'POST') {
            const authHeader = req.headers.authorization;
            const expectedSecret = process.env.API_SECRET;

            if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { app, device = 'PC' } = req.body;

            if (!app || typeof app !== 'string') {
                return res.status(400).json({ error: 'Invalid app name' });
            }

            // Validate device
            const deviceName = SUPPORTED_DEVICES.includes(device) ? device : 'PC';

            const data = {
                app: app.trim(),
                updatedAt: new Date().toISOString()
            };

            await redis.set(`${REDIS_KEY_PREFIX}:${deviceName}`, JSON.stringify(data), 'EX', 600);

            return res.status(200).json({ success: true, device: deviceName, ...data });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error) {
        console.error('Activity API Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}