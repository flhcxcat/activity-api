import { Redis } from '@upstash/redis';

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const results = {
        timestamp: new Date().toISOString(),
        checks: {}
    };

    // Check environment variables
    results.checks.envVars = {
        UPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL,
        UPSTASH_REDIS_REST_TOKEN: !!process.env.UPSTASH_REDIS_REST_TOKEN,
        API_SECRET: !!process.env.API_SECRET
    };

    const allEnvSet = Object.values(results.checks.envVars).every(v => v);

    if (!allEnvSet) {
        results.status = 'error';
        results.message = 'Missing environment variables';
        results.checks.envVars.status = 'fail';
        return res.status(500).json(results);
    }

    results.checks.envVars.status = 'pass';

    // Test Redis connection
    try {
        const redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });

        // Test write
        const testKey = '__health_check_test__';
        const testValue = Date.now().toString();
        await redis.set(testKey, testValue, { ex: 60 });

        // Test read
        const readValue = await redis.get(testKey);

        if (readValue === testValue) {
            results.checks.redis = {
                status: 'pass',
                message: 'Redis connection successful',
                latency: 'ok'
            };
        } else {
            results.checks.redis = {
                status: 'fail',
                message: 'Redis read/write mismatch'
            };
        }

        // Clean up
        await redis.del(testKey);

        // Get current activity if exists
        const currentActivity = await redis.get('current-activity');
        results.currentActivity = currentActivity || null;

    } catch (error) {
        results.checks.redis = {
            status: 'fail',
            message: error.message
        };
        results.status = 'error';
        return res.status(500).json(results);
    }

    results.status = 'ok';
    results.message = 'All systems operational';

    return res.status(200).json(results);
}
