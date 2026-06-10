const pino = require('pino');
const redis = require('./redisClient');

// const logger = pino();

const CRAWL_DELAY = 2000; // 2 seconds

async function acquireSlot() {
  while (true) {
    const acquired = await redis.set('global:crawl_lock', '1', {
      NX: true,
      PX: CRAWL_DELAY,
    });

    if (acquired) {
      return;
    }

    await new Promise((r) => setTimeout(r, 100));
  }
}

module.exports = { acquireSlot };
