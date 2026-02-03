import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

const REDIS_KEY_PREFIX = 'current-activity';
const USAGE_KEY_PREFIX = 'usage';
const SUPPORTED_DEVICES = ['PC', 'Phone', 'Tablet', 'Music'];

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function getTodayDate() {
    const now = new Date();
    // 使用东八区时间
    const offset = 8 * 60 * 60 * 1000;
    const localDate = new Date(now.getTime() + offset);
    return localDate.toISOString().split('T')[0];
}

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
            const now = new Date();
            const nowIso = now.toISOString();

            // Get previous activity to calculate usage duration
            const prevRawData = await redis.get(`${REDIS_KEY_PREFIX}:${deviceName}`);

            if (prevRawData) {
                const prevData = JSON.parse(prevRawData);
                const prevApp = prevData.app;
                const prevUpdatedAt = prevData.updatedAt;

                // Only track usage if the previous app was not 'Offline'
                if (prevApp && prevApp !== 'Offline' && prevUpdatedAt) {
                    const prevTime = new Date(prevUpdatedAt).getTime();
                    const elapsedSeconds = Math.round((now.getTime() - prevTime) / 1000);

                    // Only count if elapsed time is reasonable (less than 10 minutes)
                    // This prevents counting time when the device was offline
                    if (elapsedSeconds > 0 && elapsedSeconds <= 600) {
                        const date = getTodayDate();
                        const usageKey = `${USAGE_KEY_PREFIX}:${deviceName}:${date}`;

                        // Increment usage counter for the previous app
                        await redis.hincrby(usageKey, prevApp.trim(), elapsedSeconds);
                        // Set expiry to 1 day for cleanup
                        await redis.expire(usageKey, 24 * 60 * 60);
                    }
                }
            }

            const data = {
                app: app.trim(),
                updatedAt: nowIso
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
