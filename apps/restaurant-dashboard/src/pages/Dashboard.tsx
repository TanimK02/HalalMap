import { useEffect, useState } from 'react';
import { api, type Restaurant, type Order } from '../api';

export default function Dashboard() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Restaurant>('/restaurants/me/restaurant').then((r) => r.data).catch(() => null),
      api.get<Order[]>('/orders/restaurant/orders').then((r) => r.data).catch(() => []),
    ]).then(([r, o]) => {
      setRestaurant(r ?? null);
      setOrders(o ?? []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-text-secondary">Loading...</div>;
  if (!restaurant) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
        No restaurant profile yet. Go to <a href="/profile" className="font-medium underline">Profile</a> to create one.
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter((o) => o.createdAt.startsWith(today));
  const completedOrders = orders.filter((o) => o.status === 'COMPLETED');
  const revenue = completedOrders.reduce((sum, o) => sum + Number(o.totalPrice), 0);

  const itemCount: Record<string, number> = {};
  completedOrders.forEach((o) => {
    o.items?.forEach((i) => {
      const name = i.menuItem?.name ?? 'Unknown';
      itemCount[name] = (itemCount[name] ?? 0) + i.quantity;
    });
  });
  const popularItems = Object.entries(itemCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-text-primary">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-surface p-4">
          <p className="text-sm text-text-secondary">Orders today</p>
          <p className="text-2xl font-semibold text-primary">{todayOrders.length}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-surface p-4">
          <p className="text-sm text-text-secondary">Total revenue</p>
          <p className="text-2xl font-semibold text-primary">${revenue.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-surface p-4">
          <p className="text-sm text-text-secondary">Completed orders</p>
          <p className="text-2xl font-semibold text-primary">{completedOrders.length}</p>
        </div>
      </div>
      <div className="rounded-lg border border-gray-200 bg-surface p-4">
        <h2 className="mb-3 font-medium text-text-primary">Popular items</h2>
        {popularItems.length === 0 ? (
          <p className="text-sm text-text-secondary">No orders yet.</p>
        ) : (
          <ul className="list-inside list-disc text-sm text-text-secondary">
            {popularItems.map(([name, qty]) => (
              <li key={name}>
                {name} — {qty} ordered
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
