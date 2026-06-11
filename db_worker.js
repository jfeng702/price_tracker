const { createConsumer } = require('./kafka');

async function run() {
  const consumer = createConsumer('db-group');
  await consumer.connect();

  await consumer.subscribe({
    topic: 'scrape_results',
    fromBeginning: true,
  });

  console.log('DB worker running');

  await consumer.run({
    eachMessage: async ({ message }) => {
      const { url, title, price } = JSON.parse(message.value.toString());

      const now = new Date();

      // 1. get current product state
      const existing = await db.products.findOne({ url });

      // 2. always insert history
      await db.price_history.insertOne({
        url,
        price,
        scrapedAt: now,
      });

      // 3. upsert current product
      if (!existing) {
        await db.products.insertOne({
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
        console.log('PRICE CHANGE:', existing.currentPrice, '→', price);

        await db.products.updateOne(
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
        await db.products.updateOne(
          { url },
          {
            $set: {
              lastScrapedAt: now,
            },
          },
        );
      }
    },
  });
}

run();
