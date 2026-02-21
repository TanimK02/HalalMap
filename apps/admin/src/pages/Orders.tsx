import { useEffect, useState } from 'react';
import axios from 'axios';
import { api } from '../api';

type Order = {
  id: string;
  status: string;
  totalPrice: number | string;
  deliveryType: string;
  createdAt: string;
  user?: { id: string; name: string; email: string };
  restaurant?: { id: string; name: string };
  items: { quantity: number; menuItem: { name: string }; priceAtOrder: number | string }[];
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [message, setMessage] = useState('');

  function load() {
    const params = statusFilter ? { status: statusFilter } : {};
    api
      .get<Order[]>('/admin/orders', { params })
      .then((r) => setOrders(r.data))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [statusFilter]);

  async function refund(orderId: string) {
    if (!confirm('Issue refund for this order?')) return;
    setMessage('');
    try {
      await api.post(`/admin/orders/${orderId}/refund`);
      setMessage('Refund issued.');
      load();
    } catch (err) {
      setMessage(axios.isAxiosError(err) && err.response?.data?.error ? err.response.data.error : 'Refund failed');
    }
  }

  if (loading) return <div className="text-text-secondary">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-text-primary">Orders</h1>
      {message && (
        <div className={`rounded p-3 text-sm ${message.includes('issued') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}
      <div>
        <label className="mr-2 text-sm text-text-secondary">Filter by status:</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        >
          <option value="">All</option>
          <option value="PENDING">Pending</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="PREPARING">Preparing</option>
          <option value="READY">Ready</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>
      <div className="space-y-4">
        {orders.length === 0 ? (
          <p className="text-text-secondary">No orders.</p>
        ) : (
          orders.map((o) => (
            <div key={o.id} className="rounded border border-gray-200 bg-surface p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">#{o.id.slice(-6)}</span>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-sm">{o.status}</span>
                <span className="text-sm text-text-secondary">{new Date(o.createdAt).toLocaleString()}</span>
                <span className="font-medium text-primary">${Number(o.totalPrice).toFixed(2)}</span>
              </div>
              {o.restaurant && <p className="text-sm text-text-secondary">Restaurant: {o.restaurant.name}</p>}
              {o.user && <p className="text-sm text-text-secondary">Customer: {o.user.name} ({o.user.email})</p>}
              <ul className="my-2 list-inside list-disc text-sm">
                {(o.items ?? []).map((line, i) => (
                  <li key={i}>
                    {line.quantity}x {line.menuItem?.name} — ${Number(line.priceAtOrder ?? 0).toFixed(2)}
                  </li>
                ))}
              </ul>
              {o.status === 'COMPLETED' && (
                <button
                  type="button"
                  onClick={() => refund(o.id)}
                  className="mt-2 rounded border border-red-300 bg-white px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                >
                  Refund
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
