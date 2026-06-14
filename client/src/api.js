export async function fetchProducts({ limit, skip, search, sort, order }) {
  const params = new URLSearchParams({
    limit: String(limit),
    skip: String(skip),
    search,
    sort,
    order,
  });

  const res = await fetch(`/api/products?${params}`);
  if (!res.ok) throw new Error('Failed to load products');
  return res.json();
}

export async function fetchHistory(url) {
  const params = new URLSearchParams({ url });
  const res = await fetch(`/api/history?${params}`);
  if (!res.ok) throw new Error('Failed to load history');
  return res.json();
}
