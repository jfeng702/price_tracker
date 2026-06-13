const redis = require('./redisClient');
const { enqueueListingJob } = require('./jobQueue');
const logger = require('./logger');

const ONE_HOUR = 60 * 60 * 1000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  await redis.connect();

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
      logger.info({ url }, 'Dispatch listing job');

      await enqueueListingJob(url);

      await redis.zRem('crawl_schedule', url);

      await redis.zAdd('crawl_schedule', [
        { score: Date.now() + ONE_HOUR * 2, value: url },
      ]);
    }
  }
}

run().catch((err) => logger.error({ err }, 'Scheduler failed'));
