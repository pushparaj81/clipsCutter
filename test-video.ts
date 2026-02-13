import { getVideoInfo } from './lib/video';

async function test() {
    const url = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'; // Just an example video
    console.log('Testing getVideoInfo for:', url);
    try {
        const info = await getVideoInfo(url);
        console.log('Success!', info);
    } catch (error) {
        console.error('Test failed:', error);
    }
}

test();
