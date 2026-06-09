const Redis = require('ioredis');
const redis = new Redis('redis://localhost:6379');

const ONE_HOUR = 60 * 60 * 1000;

async function seenRecently(key, url) {
  const now = Date.now();

  const lastSeen = await redis.zscore(key, url);

  if (lastSeen && now - Number(lastSeen) < ONE_HOUR) {
    return true; // skip (too soon)
  }

  // update timestamp
  await redis.zadd(key, now, url);
  return false;
}

module.exports = { redis, seenRecently };
