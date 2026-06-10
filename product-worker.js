const axios = require('axios');
const cheerio = require('cheerio');
const { consumer, producer } = require('./kafka');
const { acquireSlot } = require('./rateLimiter');

// function sleep(ms) {
//   return new Promise((r) => setTimeout(r, ms));
// }

async function scrapeProduct(url) {
  const { data } = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });

  const $ = cheerio.load(data);

  const title = $('section.product h1').first().text().trim();

  const price = $('.product__price').first().text().trim();

  return {
    url,
    title,
    price,
  };
}

async function run() {
  await consumer.connect();
  await producer.connect();

  await consumer.subscribe({
    topic: 'product_jobs',
    fromBeginning: true,
  });

  console.log('Product worker running...');

  await consumer.run({
    eachMessage: async ({ message }) => {
      const { url } = JSON.parse(message.value.toString());

      try {
        await acquireSlot();
        const result = await scrapeProduct(url);

        console.log('Scraped:', result);

        await producer.send({
          topic: 'scrape_results',
          messages: [{ value: JSON.stringify(result) }],
        });
      } catch (err) {
        console.error('Product error:', err.message);
      }
    },
  });
}

run().catch(console.error);
