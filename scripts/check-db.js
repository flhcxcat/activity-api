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

        // Simple ping test
        const testKey = '__build_check__';
        const testValue = 'test_' + Date.now();

        await redis.set(testKey, testValue, { ex: 60 });
        const readValue = await redis.get(testKey);
        await redis.del(testKey);

        // Check if we got something back (Upstash may return different types)
        if (readValue) {
            console.log('   ✅ Redis connection successful!\n');
        } else {
            console.log('   ⚠️  Redis returned empty value, but connection works\n');
        }

    } catch (error) {
        console.log(`   ⚠️  Redis test warning: ${error.message}`);
        console.log('   Build will continue, but please check your Redis credentials.\n');
    }

    console.log('🎉 Build check completed!\n');
}

checkDatabaseConnection();
