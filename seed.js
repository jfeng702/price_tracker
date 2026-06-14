const redis = require('./redisClient');
const { enqueueListingJob } = require('./jobQueue');
const logger = require('./logger');

const urls = ['https://www.rasahydroponics.com/shop'];

function redisHost() {
  try {
    return new URL(process.env.REDIS_URL || 'redis://localhost:6379').hostname;
  } catch {
    return 'unknown';
  }
}

async function seed() {
  await redis.connect();

  const now = Date.now();
  for (const url of urls) {
    await redis.zAdd('crawl_schedule', [{ score: now, value: url }]);
    await enqueueListingJob(url);
  }

  const scheduled = await redis.zRangeByScore('crawl_schedule', 0, now + 1);

  logger.info(
    { count: urls.length, redisHost: redisHost(), scheduledNow: scheduled },
    'Seeded crawl_schedule and enqueued listing jobs (workers must use the same REDIS_URL)',
  );

  process.exit(0);
}

seed().catch((err) => {
  logger.error({ err }, 'Seed failed');
  process.exit(1);
});
