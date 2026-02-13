import 'dotenv/config';
import { redis } from './lib/redis';

async function testRedis() {
    console.log('--- Starting Redis Connection Test ---');
    try {
        // We don't need to do much, the event listeners in lib/redis.ts 
        // will log when the connection is established.
        await redis.ping();
        console.log('--- Redis Ping Successful ---');

        // Clean up
        await redis.quit();
        process.exit(0);
    } catch (error) {
        console.error('--- Redis Test Failed ---', error);
        process.exit(1);
    }
}

testRedis();
