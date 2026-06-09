const Redis = require('ioredis');
const redis = new Redis('redis://localhost:6379');

const ONE_HOUR = 60 * 60 * 1000;

const urls = ['https://www.rasahydroponics.com/shop'];

async function seed() {
  for (const url of urls) {
    await redis.zadd('crawl_schedule', Date.now(), url);
  }

  console.log('Seeded URLs');
  process.exit(0);
}

seed().catch(console.error);
