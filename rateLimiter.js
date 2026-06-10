const Redis = require('ioredis');
const redis = new Redis('redis://localhost:6379');

const CRAWL_DELAY = 2000; // 2 seconds

async function acquireSlot() {
  while (true) {
    const last = await redis.get('global:last_request_time');
    const now = Date.now();

    if (!last || now - Number(last) >= CRAWL_DELAY) {
      await redis.set('global:last_request_time', now);
      return;
    }

    await new Promise((r) => setTimeout(r, 200));
  }
}

module.exports = { acquireSlot };
