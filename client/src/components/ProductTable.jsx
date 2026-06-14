import { formatDate, formatPrice } from '../utils';

const COLUMNS = [
  { key: 'title', label: 'Title', defaultOrder: 'asc' },
  { key: 'price', label: 'Price', defaultOrder: 'desc' },
  { key: 'lastScrapedAt', label: 'Last scraped', defaultOrder: 'desc' },
];

export default function ProductTable({
  products,
  selectedUrl,
  onSelect,
  loading,
  error,
  sort,
  order,
  onSortChange,
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

  function handleSort(column) {
    if (sort === column.key) {
      onSortChange(column.key, order === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(column.key, column.defaultOrder);
    }
  }

  return (
    <table>
      <thead>
        <tr>
          {COLUMNS.map((column) => {
            const active = sort === column.key;
            return (
              <th
                key={column.key}
                className={active ? 'sortable sort-active' : 'sortable'}
                onClick={() => handleSort(column)}
                aria-sort={
                  active ? (order === 'asc' ? 'ascending' : 'descending') : 'none'
                }
              >
                {column.label}
                <span className="sort-indicator">
                  {active ? (order === 'asc' ? '↑' : '↓') : '↕'}
                </span>
              </th>
            );
          })}
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
