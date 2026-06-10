const redis = require('./redisClient');

const ONE_HOUR = 60 * 60 * 1000;

async function seenRecently(key, url) {
  const now = Date.now();

  const lastSeen = await redis.zScore(key, url);

  if (lastSeen && now - Number(lastSeen) < ONE_HOUR) {
    return true; // skip (too soon)
  }

  // update timestamp
  await redis.zAdd(key, [{ score: now, value: url }]);
  return false;
}

module.exports = { redis, seenRecently };
