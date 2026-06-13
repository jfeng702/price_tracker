const axios = require('axios');
const cheerio = require('cheerio');
const { acquireSlot } = require('./rateLimiter');
const redis = require('./redisClient');
const { products, price_history, connectMongo } = require('./mongoClient');
const { parsePrice, asNumber } = require('./parsePrice');
const { runConsumer, PRODUCT_JOBS } = require('./jobQueue');
const logger = require('./logger');

async function scrapeProduct(url) {
  const { data } = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });

  const $ = cheerio.load(data);

  const title = $('section.product h1').first().text().trim();

  const priceText = $('.product__price').first().text().trim();
  const price = parsePrice(priceText);

  return {
    title,
    price,
    priceText,
  };
}

async function run() {
  await redis.connect();
  await connectMongo();

  logger.info('Product worker running');

  await runConsumer(PRODUCT_JOBS, async ({ url }) => {
    await acquireSlot();
    const { title, price, priceText } = await scrapeProduct(url);

    if (price == null) {
      logger.warn({ url, priceText }, 'Could not parse price');
      return;
    }

    logger.info({ url, title, price }, 'Scraped product');

    const now = new Date();

    const existing = await products.findOne({ url });

    await price_history.insertOne({
      url,
      price,
      scrapedAt: now,
    });

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

    const previousPrice = asNumber(existing.currentPrice);

    if (previousPrice !== price) {
      logger.info({ url, from: previousPrice, to: price }, 'Price change');

      await products.updateOne(
        { url },
        {
          $set: {
            title,
            currentPrice: price,
            lastScrapedAt: now,
            lastChangeAt: now,
            lastPrice: previousPrice ?? price,
          },
        },
      );
    } else {
      await products.updateOne(
        { url },
        {
          $set: {
            lastScrapedAt: now,
          },
        },
      );
    }
  });
}

run().catch((err) => logger.error({ err }, 'Product worker failed'));
