const { createClient } = require('redis');

const redis = createClient({
  url: 'redis://localhost:6379',
});

module.exports = redis;
