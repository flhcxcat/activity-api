// Build-time database connection check
import { Redis } from '@upstash/redis';

async function checkDatabaseConnection() {
    console.log('🔍 Checking database connection...\n');

    // Check environment variables
    const envVars = {
        UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
        UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
        API_SECRET: process.env.API_SECRET
    };

    console.log('📋 Environment Variables:');
    for (const [key, value] of Object.entries(envVars)) {
        const status = value ? '✅' : '❌';
        const display = value ? '(set)' : '(missing)';
        console.log(`   ${status} ${key}: ${display}`);
    }
    console.log('');

    // Check if all required env vars are set
    if (!envVars.UPSTASH_REDIS_REST_URL || !envVars.UPSTASH_REDIS_REST_TOKEN) {
        console.log('⚠️  Warning: Redis environment variables not set.');
        console.log('   This is expected during first deployment.');
        console.log('   Please add environment variables in Vercel dashboard.\n');
        console.log('✅ Build completed (skipping database check)\n');
        process.exit(0);
    }

    // Test Redis connection
    console.log('🔌 Testing Redis connection...');
    try {
        const redis = new Redis({
            url: envVars.UPSTASH_REDIS_REST_URL,
            token: envVars.UPSTASH_REDIS_REST_TOKEN,
        });

        // Ping test
        const testKey = '__build_check__';
        const testValue = Date.now().toString();

        await redis.set(testKey, testValue, { ex: 60 });
        const readValue = await redis.get(testKey);
        await redis.del(testKey);

        if (readValue === testValue) {
            console.log('   ✅ Redis connection successful!\n');
        } else {
            console.log('   ❌ Redis read/write test failed\n');
            process.exit(1);
        }

    } catch (error) {
        console.log(`   ❌ Redis connection failed: ${error.message}\n`);
        process.exit(1);
    }

    console.log('🎉 All checks passed!\n');
}

checkDatabaseConnection();
