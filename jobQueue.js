const redis = require('./redisClient');
const logger = require('./logger');

const LISTING_JOBS = 'queue:listing_jobs';
const PRODUCT_JOBS = 'queue:product_jobs';

async function enqueueListingJob(url) {
  await redis.rPush(LISTING_JOBS, JSON.stringify({ url }));
}

async function enqueueProductJob(url) {
  await redis.rPush(PRODUCT_JOBS, JSON.stringify({ url }));
}

async function runConsumer(queueKey, handler) {
  while (true) {
    const result = await redis.blPop(queueKey, 0);
    const { url } = JSON.parse(result.element);

    try {
      await handler({ url });
    } catch (err) {
      logger.error({ err, queueKey, url }, 'Job handler failed');
    }
  }
}

module.exports = {
  LISTING_JOBS,
  PRODUCT_JOBS,
  enqueueListingJob,
  enqueueProductJob,
  runConsumer,
};
