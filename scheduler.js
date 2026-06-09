const Redis = require('ioredis');
const { producer } = require('./kafka');

const redis = new Redis('redis://localhost:6379');

const ONE_HOUR = 60 * 60 * 1000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  await producer.connect();

  console.log('Scheduler running...');

  while (true) {
    const now = Date.now();

    const urls = await redis.zrangebyscore(
      'crawl_schedule',
      0,
      now,
      'LIMIT',
      0,
      20,
    );

    if (urls.length === 0) {
      await sleep(1000);
      continue;
    }

    for (const url of urls) {
      // remove from schedule first
      await redis.zrem('crawl_schedule', url);

      console.log('Dispatch → listing_jobs:', url);

      // send to Kafka
      await producer.send({
        topic: 'listing_jobs',
        messages: [{ value: JSON.stringify({ url }) }],
      });

      // 🔁 RESCHEDULE for next hour
      await redis.zadd('crawl_schedule', Date.now() + ONE_HOUR, url);
    }
  }
}

run().catch(console.error);
