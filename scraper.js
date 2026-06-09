const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeProduct(url) {
  const { data } = await axios.get(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    },
  });

  const $ = cheerio.load(data);

  const title = $('h1').first().text().trim();

  const price =
    $('[class*="price"]').first().text().trim() ||
    $('meta[property="product:price:amount"]').attr('content');

  // const url = $('href').first()

  return {
    url,
    title,
    price,
  };
}

async function scrapeListing(url) {
  const { data } = await axios.get(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    },
  });

  const $ = cheerio.load(data);

  const products = [];

  $('.prod-card').each((_, el) => {
    const card = $(el);

    const title = card.find('.product-card__title').text().trim();

    const link = card.find('.prod-card__img-link').attr('href');

    const price = card.find('.prod-card__price').text().trim();

    if (link) {
      products.push({
        title,
        url: new URL(link, url).href,
        price,
      });
    }
  });

  const nextHref = $('link[rel="next"]').attr('href');
  const nextPage = nextHref ? new URL(nextHref, url).href : null;

  return { products, nextPage };
}

module.exports = { scrapeProduct, scrapeListing };
