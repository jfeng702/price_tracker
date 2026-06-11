const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'price-tracker',
  brokers: (process.env.KAFKA_BROKER || 'localhost:9092').split(','),
});

const producer = kafka.producer();

function createConsumer(groupId) {
  return kafka.consumer({ groupId });
}

module.exports = { kafka, producer, createConsumer };
