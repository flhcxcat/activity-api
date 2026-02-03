import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

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
            // GET /api/usage?device=PC&date=2026-02-03
            const { device = 'PC', date = getTodayDate() } = req.query;

            // Validate device
            const deviceName = SUPPORTED_DEVICES.includes(device) ? device : 'PC';

            // Get usage data from Redis Hash
            const usageKey = `${USAGE_KEY_PREFIX}:${deviceName}:${date}`;
            const usageData = await redis.hgetall(usageKey);

            // Convert string values to numbers
            const usage = {};
            let totalSeconds = 0;
            for (const [app, seconds] of Object.entries(usageData)) {
                const secs = parseInt(seconds, 10);
                usage[app] = secs;
                totalSeconds += secs;
            }

            return res.status(200).json({
                date,
                device: deviceName,
                usage,
                totalSeconds
            });
        }

        if (req.method === 'POST') {
            const authHeader = req.headers.authorization;
            const expectedSecret = process.env.API_SECRET;

            if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { app, device = 'PC', seconds } = req.body;

            if (!app || typeof app !== 'string') {
                return res.status(400).json({ error: 'Invalid app name' });
            }

            if (typeof seconds !== 'number' || seconds <= 0) {
                return res.status(400).json({ error: 'Invalid seconds value' });
            }

            // Validate device
            const deviceName = SUPPORTED_DEVICES.includes(device) ? device : 'PC';

            const date = getTodayDate();
            const usageKey = `${USAGE_KEY_PREFIX}:${deviceName}:${date}`;

            // Increment the usage counter for this app
            const newValue = await redis.hincrby(usageKey, app.trim(), Math.round(seconds));

            // Set expiry to 1 day for cleanup
            await redis.expire(usageKey, 24 * 60 * 60);

            return res.status(200).json({
                success: true,
                device: deviceName,
                app: app.trim(),
                date,
                totalSeconds: newValue
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error) {
        console.error('Usage API Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
