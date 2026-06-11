const { MongoClient } = require('mongodb');

const client = new MongoClient(
  process.env.MONGO_URL || 'mongodb://localhost:27017',
);
const db = client.db('price_tracker');
const products = db.collection('products');
const price_history = db.collection('price_history');

async function initCollections() {
  await products.createIndex({ url: 1 }, { unique: true });
  await price_history.createIndex({ url: 1, scrapedAt: -1 });
}

async function connectMongo() {
  await client.connect();
  await initCollections();
}

module.exports = { products, price_history, connectMongo };
