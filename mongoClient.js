const { MongoClient } = require('mongodb');

const client = new MongoClient(
  process.env.MONGO_URL || 'mongodb://localhost:27017',
);
const db = client.db('price_tracker');

async function connectMongo() {
  await client.connect();
}

module.exports = { db, connectMongo };
