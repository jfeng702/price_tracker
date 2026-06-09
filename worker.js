const Redis = require('ioredis');
const { Kafka } = require('kafkajs');
const { scrapeProduct, scrapeListing } = require('./scraper');

const redis = new Redis('redis://localhost:6379');

const kafka = new Kafka({
  clientId: 'crawler-worker',
  brokers: ['localhost:9092'],
});

const consumer = kafka.consumer({ groupId: 'workers' });

const ZSET_KEY = 'crawl_schedule';
const LISTING_ENTRY = 'https://www.rasahydroponics.com/shop/';

function isListingUrl(url) {
  const { pathname } = new URL(url);
  return pathname === '/shop/' || /^\/shop\/page\d+\.html$/.test(pathname);
}

async function run() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'crawl_jobs', fromBeginning: false });

  console.log('Worker started...');

  await consumer.run({
    eachMessage: async ({ message }) => {
      const { url } = JSON.parse(message.value.toString());

      try {
        if (isListingUrl(url)) {
          const { products, nextPage } = await scrapeListing(url);

          for (const product of products) {
            await redis.zadd(ZSET_KEY, Date.now(), product.url);
          }

          if (nextPage) {
            await redis.zadd(ZSET_KEY, Date.now(), nextPage);
          }

          if (url === LISTING_ENTRY) {
            const nextRun = Date.now() + 24 * 60 * 60 * 1000;
            await redis.zadd(ZSET_KEY, nextRun, url);
          }

          console.log(
            `Listing ${url}: queued ${products.length} products` +
              (nextPage ? `, next page ${nextPage}` : ', last page')
          );
        } else {
          const result = await scrapeProduct(url);

          console.log('Scraped:', result);

          const nextRun = Date.now() + 60 * 60 * 1000;
          await redis.zadd(ZSET_KEY, nextRun, url);

          console.log('Rescheduled:', url);
        }
      } catch (err) {
        console.error('Failed:', url, err.message);

        const retryTime = Date.now() + 5 * 60 * 1000;
        await redis.zadd(ZSET_KEY, retryTime, url);
      }
    },
  });
}

run();
