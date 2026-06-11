const axios = require('axios');
const cheerio = require('cheerio');
const { createConsumer, producer } = require('./kafka');
const { acquireSlot } = require('./rateLimiter');
const redis = require('./redisClient');
const { products, price_history, connectMongo } = require('./mongoClient');
const logger = require('./logger');

async function scrapeProduct(url) {
  const { data } = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });

  const $ = cheerio.load(data);

  const title = $('section.product h1').first().text().trim();

  const price = $('.product__price').first().text().trim();

  return {
    title,
    price,
  };
}

async function run() {
  await redis.connect();
  await connectMongo();
  const consumer = createConsumer('product-group');
  await consumer.connect();
  await producer.connect();

  await consumer.subscribe({
    topic: 'product_jobs',
    fromBeginning: true,
  });

  logger.info('Product worker running');

  await consumer.run({
    eachMessage: async ({ message }) => {
      const { url } = JSON.parse(message.value.toString());

      try {
        await acquireSlot();
        const { title, price } = await scrapeProduct(url);

        logger.info({ url, title, price }, 'Scraped product');

        const now = new Date();

        // 1. get current product state
        const existing = await products.findOne({ url });

        // 2. always insert history
        await price_history.insertOne({
          url,
          price,
          scrapedAt: now,
        });

        // 3. upsert current product
        if (!existing) {
          await products.insertOne({
            url,
            title,
            currentPrice: price,
            lastScrapedAt: now,
            lastChangeAt: now,
            lastPrice: price,
            imageUrl: '',
          });
          return;
        }

        // 4. detect change
        if (existing.currentPrice !== price) {
          logger.info(
            { url, from: existing.currentPrice, to: price },
            'Price change',
          );

          await products.updateOne(
            { url },
            {
              $set: {
                title,
                currentPrice: price,
                lastScrapedAt: now,
                lastChangeAt: now,
                lastPrice: existing.currentPrice,
              },
            },
          );
        } else {
          // no change, just update timestamp
          await products.updateOne(
            { url },
            {
              $set: {
                lastScrapedAt: now,
              },
            },
          );
        }
      } catch (err) {
        logger.error({ err }, 'Product error');
      }
    },
  });
}

run().catch((err) => logger.error({ err }, 'Product worker failed'));
