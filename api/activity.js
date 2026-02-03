import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

const REDIS_KEY = 'current-activity';

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
            const rawData = await redis.get(REDIS_KEY);

            if (!rawData) {
                return res.status(200).json({
                    app: 'Offline',
                    updatedAt: null
                });
            }

            const data = JSON.parse(rawData);
            return res.status(200).json(data);
        }

        if (req.method === 'POST') {
            const authHeader = req.headers.authorization;
            const expectedSecret = process.env.API_SECRET;

            if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { app } = req.body;

            if (!app || typeof app !== 'string') {
                return res.status(400).json({ error: 'Invalid app name' });
            }

            const data = {
                app: app.trim(),
                updatedAt: new Date().toISOString()
            };

            await redis.set(REDIS_KEY, JSON.stringify(data), 'EX', 600);

            return res.status(200).json({ success: true, ...data });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error) {
        console.error('Activity API Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}