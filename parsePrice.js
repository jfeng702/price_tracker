function parsePrice(text) {
  if (text == null || text === '') return null;

  const cleaned = String(text).replace(/[^0-9.-]+/g, '');
  const value = parseFloat(cleaned);

  if (Number.isNaN(value)) return null;

  return Math.round(value * 100) / 100;
}

function asNumber(value) {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') return parsePrice(value);
  return null;
}

module.exports = { parsePrice, asNumber };
