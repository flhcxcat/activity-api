import Redis from 'ioredis';

export default async function handler(req, res) {
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

    results.checks.envVars = {
        REDIS_URL: !!process.env.REDIS_URL,
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

    let redis;
    try {
        redis = new Redis(process.env.REDIS_URL, {
            maxRetriesPerRequest: 1,
            connectTimeout: 3000
        });

        const testKey = '__health_check_test__';
        const testValue = Date.now().toString();
        
        await redis.set(testKey, testValue, 'EX', 60);

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

        await redis.del(testKey);

        const currentActivity = await redis.get('current-activity');
        
        try {
            results.currentActivity = currentActivity ? JSON.parse(currentActivity) : null;
        } catch {
            results.currentActivity = currentActivity;
        }

    } catch (error) {
        results.checks.redis = {
            status: 'fail',
            message: error.message
        };
        results.status = 'error';
        return res.status(500).json(results);
    } finally {
        if (redis) {
            redis.quit();
        }
    }

    results.status = 'ok';
    results.message = 'All systems operational';

    return res.status(200).json(results);
}