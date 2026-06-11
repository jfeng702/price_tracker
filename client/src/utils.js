export function formatPrice(value) {
  if (value == null) return '—';
  return `$${value.toFixed(2)}`;
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export function formatChartDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
