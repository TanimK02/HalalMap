import { useEffect, useState } from 'react';
import { api } from '../api';

type Analytics = {
  totalOrders: number;
  totalRevenue: number | string;
  restaurantCount: number;
  pendingRestaurants: number;
  recentOrders: { id: string; status: string; totalPrice: number | string; restaurant?: { name: string }; user?: { name: string }; createdAt: string }[];
  period?: { from: string; to: string };
  platformFeeTotal?: number | null;
};

type DateRange = 'all' | '7' | '30' | '90';

function getPeriodParams(range: DateRange): { from?: string; to?: string } {
  if (range === 'all') return {};
  const days = parseInt(range, 10);
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date(to);
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

function getRevenueLabel(range: DateRange): string {
  if (range === 'all') return 'All-time revenue';
  if (range === '7') return 'Revenue (Last 7 days)';
  if (range === '30') return 'Revenue (Last 30 days)';
  if (range === '90') return 'Revenue (Last 90 days)';
  return 'All-time revenue';
}

export default function Analytics() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('all');

  useEffect(() => {
    setLoading(true);
    const params = getPeriodParams(dateRange);
    api
      .get<Analytics>('/admin/analytics', { params })
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [dateRange]);

  if (loading && !data) return <div className="text-text-secondary">Loading...</div>;
  if (!data) return <div className="text-text-secondary">Failed to load analytics.</div>;

  const revenueLabel = getRevenueLabel(dateRange);
  const showPlatformFee = data.platformFeeTotal != null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-text-primary">Platform analytics</h1>
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <span>Date range:</span>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            className="rounded border border-gray-200 bg-surface px-3 py-1.5 text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded border border-gray-200 bg-surface p-4">
          <p className="text-sm text-text-secondary">
            {dateRange === 'all' ? 'Completed orders' : 'Orders in period'}
          </p>
          <p className="text-2xl font-semibold text-primary">{data.totalOrders}</p>
        </div>
        <div className="rounded border border-gray-200 bg-surface p-4">
          <p className="text-sm text-text-secondary">{revenueLabel}</p>
          <p className="text-2xl font-semibold text-primary">${Number(data.totalRevenue).toFixed(2)}</p>
        </div>
        <div className="rounded border border-gray-200 bg-surface p-4">
          <p className="text-sm text-text-secondary">Approved restaurants</p>
          <p className="text-2xl font-semibold text-primary">{data.restaurantCount}</p>
        </div>
        <div className="rounded border border-gray-200 bg-surface p-4">
          <p className="text-sm text-text-secondary">Pending restaurants</p>
          <p className="text-2xl font-semibold text-primary">{data.pendingRestaurants}</p>
        </div>
      </div>
      {showPlatformFee && (
        <div className="rounded border border-gray-200 bg-surface p-4">
          <h2 className="mb-3 font-medium text-text-primary">Revenue breakdown</h2>
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-text-secondary">Platform fee collected: </span>
              <span className="font-medium text-primary">
                ${((data.platformFeeTotal ?? 0) / 100).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
      <div className="rounded border border-gray-200 bg-surface p-4">
        <h2 className="mb-3 font-medium text-text-primary">Recent orders</h2>
        {data.recentOrders?.length === 0 ? (
          <p className="text-sm text-text-secondary">No orders yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {(data.recentOrders ?? []).map((o) => (
              <li key={o.id} className="flex justify-between">
                <span>
                  {o.restaurant?.name} — {o.user?.name} — ${Number(o.totalPrice).toFixed(2)}
                </span>
                <span className="text-text-secondary">{new Date(o.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
