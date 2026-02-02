import { Redis } from '@upstash/redis';

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const REDIS_KEY = 'current-activity';

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req, res) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).set(corsHeaders).end();
    }

    // Set CORS headers for all responses
    Object.entries(corsHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
    });

    try {
        if (req.method === 'GET') {
            // Get current activity
            const data = await redis.get(REDIS_KEY);

            if (!data) {
                return res.status(200).json({
                    app: 'Offline',
                    updatedAt: null
                });
            }

            return res.status(200).json(data);
        }

        if (req.method === 'POST') {
            // Verify API secret
            const authHeader = req.headers.authorization;
            const expectedSecret = process.env.API_SECRET;

            if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            // Parse body
            const { app } = req.body;

            if (!app || typeof app !== 'string') {
                return res.status(400).json({ error: 'Invalid app name' });
            }

            // Store in Redis with TTL of 10 minutes
            const data = {
                app: app.trim(),
                updatedAt: new Date().toISOString()
            };

            await redis.set(REDIS_KEY, data, { ex: 600 }); // 10 minutes TTL

            return res.status(200).json({ success: true, ...data });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error) {
        console.error('Activity API Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
