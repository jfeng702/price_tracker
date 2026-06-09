const Redis = require('ioredis');
const redis = new Redis('redis://localhost:6379');

const urls = [
  'https://www.rasahydroponics.com/shop/',
  // 'https://www.rasahydroponics.com/products/example2',
];

async function seed() {
  for (const url of urls) {
    await redis.zadd('crawl_schedule', Date.now(), url);
  }

  console.log('Seeded URLs');
}

seed();
