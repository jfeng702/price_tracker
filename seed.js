const redis = require('./redisClient');

const ONE_HOUR = 60 * 60 * 1000;

const urls = ['https://www.rasahydroponics.com/shop'];

async function seed() {
  await redis.connect();
  for (const url of urls) {
    await redis.zAdd('crawl_schedule', [{ score: Date.now(), value: url }]);
  }

  console.log('Seeded URLs');
  process.exit(0);
}

seed().catch(console.error);
