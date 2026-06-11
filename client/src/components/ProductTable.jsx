import { formatDate, formatPrice } from '../utils';

export default function ProductTable({
  products,
  selectedUrl,
  onSelect,
  loading,
  error,
}) {
  if (loading && products.length === 0) {
    return <p className="table-message">Loading products…</p>;
  }

  if (error) {
    return <p className="table-message">Failed to load products.</p>;
  }

  if (products.length === 0) {
    return <p className="table-message">No products found.</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Title</th>
          <th>Price</th>
          <th>Last scraped</th>
        </tr>
      </thead>
      <tbody>
        {products.map((product) => (
          <tr
            key={product.url}
            className={product.url === selectedUrl ? 'selected' : ''}
            onClick={() => onSelect(product.url)}
          >
            <td className="title-cell">{product.title || product.url}</td>
            <td className="price-cell">{formatPrice(product.currentPrice)}</td>
            <td>{formatDate(product.lastScrapedAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
