const axios = require('axios');
const cheerio = require('cheerio');
const { createConsumer, producer } = require('./kafka');
const { isBlocked } = require('./robots');
const { seenRecently } = require('./dedupe');
const { acquireSlot } = require('./rateLimiter');
const redis = require('./redisClient');
const logger = require('./logger');

async function scrapeListing(url) {
  const { data } = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });

  const $ = cheerio.load(data);

  const products = [];
  const pages = [];

  $('.prod-card .prod-card__img-link').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;

    const full = new URL(href, url).href;
    if (!isBlocked(full)) products.push(full);
  });

  const nextUrl = $('a.pagination__item')
    .filter((_, el) => $(el).text().includes('Next'))
    .attr('href');

  if (
    nextUrl &&
    !isBlocked(nextUrl) &&
    nextUrl !== 'https://www.rasahydroponics.com/'
  ) {
    pages.push(nextUrl);
  }

  return { products, pages };
}

async function run() {
  try {
    await redis.connect();
    const consumer = createConsumer('listing-group');
    await consumer.connect();
    await producer.connect();

    await consumer.subscribe({
      topic: 'listing_jobs',
      fromBeginning: true,
    });

    logger.info('Listing worker running');

    await consumer.run({
      eachMessage: async ({ message }) => {
        const { url } = JSON.parse(message.value.toString());

        if (isBlocked(url)) return;

        logger.info({ url }, 'Listing scrape');

        await acquireSlot();
        const { products, pages } = await scrapeListing(url);

        for (const p of products) {
          if (await seenRecently('dedupe:products', p)) continue;

          await producer.send({
            topic: 'product_jobs',
            messages: [{ value: JSON.stringify({ url: p }) }],
          });
        }

        for (const p of pages) {
          if (await seenRecently('dedupe:pages', p)) continue;

          await producer.send({
            topic: 'listing_jobs',
            messages: [{ value: JSON.stringify({ url: p }) }],
          });
        }
      },
    });
  } catch (err) {
    logger.error({ err }, 'Listing worker failed');
  }
}

run();
