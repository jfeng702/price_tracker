import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { formatChartDate, formatPrice, roundPrice } from '../utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
);

export default function PriceChart({ history, loading, error }) {
  if (loading) {
    return <p className="empty-state">Loading chart…</p>;
  }

  if (error) {
    return <p className="empty-state">Failed to load history.</p>;
  }

  const points = history.filter((row) => row.price != null);

  if (points.length === 0) {
    return <p className="empty-state">No price history for this product.</p>;
  }

  const data = {
    labels: points.map((row) => formatChartDate(row.scrapedAt)),
    datasets: [
      {
        label: 'Price (USD)',
        data: points.map((row) => roundPrice(row.price)),
        borderColor: '#2f6b4f',
        backgroundColor: 'rgba(47, 107, 79, 0.12)',
        fill: true,
        tension: 0.2,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        ticks: {
          callback: (value) => formatPrice(value),
        },
        beginAtZero: true,
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => formatPrice(ctx.parsed.y),
        },
      },
    },
  };

  return (
    <div className="chart-canvas">
      <Line data={data} options={options} />
    </div>
  );
}
