import { useEffect, useState } from 'react';
import { api } from '../api';

type Analytics = {
  totalOrders: number;
  totalRevenue: number | string;
  restaurantCount: number;
  pendingRestaurants: number;
  recentOrders: { id: string; status: string; totalPrice: number | string; restaurant?: { name: string }; user?: { name: string }; createdAt: string }[];
};

export default function Analytics() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Analytics>('/admin/analytics')
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-text-secondary">Loading...</div>;
  if (!data) return <div className="text-text-secondary">Failed to load analytics.</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-text-primary">Platform analytics</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded border border-gray-200 bg-surface p-4">
          <p className="text-sm text-text-secondary">Completed orders</p>
          <p className="text-2xl font-semibold text-primary">{data.totalOrders}</p>
        </div>
        <div className="rounded border border-gray-200 bg-surface p-4">
          <p className="text-sm text-text-secondary">Total revenue</p>
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
