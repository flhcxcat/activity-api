import Redis from 'ioredis';

async function checkDatabaseConnection() {
    console.log('🔍 Checking database connection...\n');

    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
        console.log('⚠️  Warning: REDIS_URL environment variable not set.');
        console.log('   Please add REDIS_URL in Vercel dashboard.\n');
        process.exit(0);
    }

    console.log('🔌 Testing Redis connection...');
    
    let redis;
    try {
        redis = new Redis(redisUrl, {
            maxRetriesPerRequest: 1,
            connectTimeout: 5000,
            lazyConnect: true
        });

        await redis.connect();

        const testKey = '__build_check__';
        const testValue = 'test_' + Date.now();

        await redis.set(testKey, testValue, 'EX', 60);
        const readValue = await redis.get(testKey);
        await redis.del(testKey);

        if (readValue === testValue) {
            console.log('   ✅ Redis connection successful!\n');
        } else {
            console.log('   ⚠️  Redis read/write mismatch\n');
        }

    } catch (error) {
        console.log(`   ⚠️  Redis test warning: ${error.message}`);
        console.log('   Build will continue, but please check your Redis credentials.\n');
    } finally {
        if (redis) {
            redis.quit();
        }
    }

    console.log('🎉 Build check completed!\n');
    process.exit(0);
}

checkDatabaseConnection();