const Redis = require('ioredis');
const { Kafka } = require('kafkajs');

const redis = new Redis('redis://localhost:6379');

const kafka = new Kafka({
  clientId: 'crawler',
  brokers: ['localhost:9092'],
});

const producer = kafka.producer();

const ZSET_KEY = 'crawl_schedule';

async function runScheduler() {
  await producer.connect();

  console.log('Scheduler started...');

  while (true) {
    const now = Date.now();

    // get due URLs
    const urls = await redis.zrangebyscore(ZSET_KEY, 0, now, 'LIMIT', 0, 50);

    for (const url of urls) {
      // remove from schedule
      await redis.zrem(ZSET_KEY, url);

      // push to Kafka
      await producer.send({
        topic: 'crawl_jobs',
        messages: [{ value: JSON.stringify({ url }) }],
      });

      console.log('Scheduled:', url);
    }

    await new Promise((r) => setTimeout(r, 1000));
  }
}

runScheduler();
