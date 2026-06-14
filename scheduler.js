const redis = require('./redisClient');
const { enqueueListingJob } = require('./jobQueue');
const logger = require('./logger');

const ONE_HOUR = 60 * 60 * 1000;
const MAX_IDLE_SLEEP_MS = 60 * 60 * 1000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Avoid polling Redis every second while waiting for the next crawl. */
async function sleepUntilNextScheduled() {
  const next = await redis.zRangeWithScores('crawl_schedule', 0, 0);

  if (next.length === 0) {
    await sleep(MAX_IDLE_SLEEP_MS);
    return;
  }

  const waitMs = Math.max(1000, Number(next[0].score) - Date.now());
  await sleep(Math.min(waitMs, MAX_IDLE_SLEEP_MS));
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
      await sleepUntilNextScheduled();
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
