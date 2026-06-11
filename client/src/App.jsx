import { useCallback, useEffect, useState } from 'react';
import { fetchHistory, fetchProducts } from './api';
import ProductTable from './components/ProductTable';
import PriceChart from './components/PriceChart';

const PAGE_SIZE = 50;

export default function App() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [skip, setSkip] = useState(0);
  const [total, setTotal] = useState(0);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(false);

  const [selectedUrl, setSelectedUrl] = useState(null);
  const [chartTitle, setChartTitle] = useState('Select a product');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setSkip(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setProductsLoading(true);
      setProductsError(false);

      try {
        const data = await fetchProducts({
          limit: PAGE_SIZE,
          skip,
          search,
        });
        if (!cancelled) {
          setProducts(data.products);
          setTotal(data.total);
        }
      } catch {
        if (!cancelled) setProductsError(true);
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [skip, search]);

  const loadHistory = useCallback(async (url) => {
    setHistoryLoading(true);
    setHistoryError(false);
    setHistory([]);

    try {
      const data = await fetchHistory(url);
      setChartTitle(data.title || data.url);
      setHistory(data.history);
    } catch {
      setChartTitle('Failed to load history');
      setHistoryError(true);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const handleSelect = (url) => {
    setSelectedUrl(url);
    loadHistory(url);
  };

  const page = Math.floor(skip / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <header className="header">
        <h1>Price Tracker</h1>
        <p className="subtitle">Browse products and view price history</p>
      </header>

      <main className="layout">
        <section className="panel products-panel">
          <div className="panel-header">
            <input
              type="search"
              placeholder="Search by title…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              autoComplete="off"
            />
            <span className="meta">{total} products</span>
          </div>
          <div className="table-wrap">
            <ProductTable
              products={products}
              selectedUrl={selectedUrl}
              onSelect={handleSelect}
              loading={productsLoading}
              error={productsError}
            />
          </div>
          <div className="pagination">
            <button
              type="button"
              disabled={skip === 0}
              onClick={() => setSkip(Math.max(0, skip - PAGE_SIZE))}
            >
              Previous
            </button>
            <span>Page {page} of {totalPages}</span>
            <button
              type="button"
              disabled={skip + PAGE_SIZE >= total}
              onClick={() => setSkip(skip + PAGE_SIZE)}
            >
              Next
            </button>
          </div>
        </section>

        <section className="panel chart-panel">
          <div className="panel-header">
            <h2>{chartTitle}</h2>
            {selectedUrl && !historyError && (
              <a className="meta link" href={selectedUrl} target="_blank" rel="noreferrer">
                View page
              </a>
            )}
          </div>
          <div
            className={`chart-wrap ${selectedUrl && history.length > 0 ? 'has-data' : ''}`}
          >
            {!selectedUrl ? (
              <p className="empty-state">Click a row to see price history</p>
            ) : (
              <PriceChart
                history={history}
                loading={historyLoading}
                error={historyError}
              />
            )}
          </div>
        </section>
      </main>
    </>
  );
}
