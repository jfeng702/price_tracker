const axios = require('axios');
const cheerio = require('cheerio');
const { consumer, producer } = require('./kafka');
const { isBlocked } = require('./robots');
const { seenRecently } = require('./dedupe');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

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

  if (!nextUrl || nextUrl === 'https://www.rasahydroponics.com/') return;
  if (!isBlocked(nextUrl)) {
    pages.push(nextUrl);
  }

  return { products, pages };
}

async function run() {
  await consumer.connect();
  await producer.connect();

  await consumer.subscribe({
    topic: 'listing_jobs',
    fromBeginning: true,
  });

  console.log('Listing worker running...');

  await consumer.run({
    eachMessage: async ({ message }) => {
      const { url } = JSON.parse(message.value.toString());

      if (isBlocked(url)) return;

      console.log('Listing:', url);

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
      // robots crawl-delay = 2 seconds
      await sleep(2000);
    },
  });
}

run();
