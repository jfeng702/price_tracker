const { producer } = require('./kafka');
const redis = require('./redisClient');
const logger = require('./logger');

const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = ONE_HOUR * 24;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  await redis.connect();
  await producer.connect();

  logger.info('Scheduler running');

  while (true) {
    const now = Date.now();

    const urls = await redis.zRangeByScore(
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

      logger.info({ url }, 'Dispatch listing job');

      // send to Kafka
      await producer.send({
        topic: 'listing_jobs',
        messages: [{ value: JSON.stringify({ url }) }],
      });

      await redis.zRem('crawl_schedule', url);

      // 🔁 RESCHEDULE for next hour
      await redis.zAdd('crawl_schedule', [
        { score: Date.now() + ONE_DAY, value: url },
      ]);
    }
  }
}

run().catch((err) => logger.error({ err }, 'Scheduler failed'));
