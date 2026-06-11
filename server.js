const fs = require('fs');
const express = require('express');
const path = require('path');
const { products, price_history, connectMongo } = require('./mongoClient');
const { asNumber } = require('./parsePrice');
const logger = require('./logger');

const PORT = process.env.PORT || 3000;
const app = express();
const clientDist = path.join(__dirname, 'client', 'dist');

function normalizeProduct(doc) {
  return {
    url: doc.url,
    title: doc.title,
    currentPrice: asNumber(doc.currentPrice),
    lastPrice: asNumber(doc.lastPrice),
    lastScrapedAt: doc.lastScrapedAt,
    lastChangeAt: doc.lastChangeAt,
  };
}

app.get('/api/products', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const skip = parseInt(req.query.skip, 10) || 0;
    const search = (req.query.search || '').trim();

    const filter = search
      ? { title: { $regex: search, $options: 'i' } }
      : {};

    const [docs, total] = await Promise.all([
      products
        .find(filter)
        .sort({ lastScrapedAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      products.countDocuments(filter),
    ]);

    res.json({
      products: docs.map(normalizeProduct),
      total,
      limit,
      skip,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to list products');
    res.status(500).json({ error: 'Failed to list products' });
  }
});

app.get('/api/history', async (req, res) => {
  const url = req.query.url;
  if (!url) {
    res.status(400).json({ error: 'url is required' });
    return;
  }

  try {
    const product = await products.findOne({ url });
    const history = await price_history
      .find({ url })
      .sort({ scrapedAt: 1 })
      .toArray();

    res.json({
      url,
      title: product?.title ?? null,
      history: history.map((row) => ({
        price: asNumber(row.price),
        scrapedAt: row.scrapedAt,
      })),
    });
  } catch (err) {
    logger.error({ err, url }, 'Failed to load history');
    res.status(500).json({ error: 'Failed to load history' });
  }
});

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));

  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  logger.warn('client/dist not found — run npm run build:client');
}

async function start() {
  await connectMongo();
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'Web UI running');
  });
}

start().catch((err) => logger.error({ err }, 'Server failed'));
