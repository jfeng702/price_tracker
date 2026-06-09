const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'price-tracker',
  brokers: ['localhost:9092'],
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'crawler-group' });

module.exports = { kafka, producer, consumer };
