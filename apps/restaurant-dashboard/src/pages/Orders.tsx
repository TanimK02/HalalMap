import { useEffect, useState } from 'react';
import { api, type Order } from '../api';
import { ORDER_STATUS_LABELS } from '../constants';

const STATUS_ORDER = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'] as const;

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');

  function load() {
    const params = statusFilter ? { status: statusFilter } : {};
    api
      .get<Order[]>('/orders/restaurant/orders', { params })
      .then((r) => setOrders(r.data))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [statusFilter]);

  async function updateStatus(orderId: string, status: string) {
    try {
      await api.patch(`/orders/restaurant/orders/${orderId}`, { status });
      load();
    } catch (e) {
      console.error(e);
    }
  }

  if (loading) return <div className="text-text-secondary">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-text-primary">Orders</h1>
      <div className="flex gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        >
          <option value="">All statuses</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-4">
        {orders.length === 0 ? (
          <p className="text-text-secondary">No orders yet.</p>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              className="rounded border border-gray-200 bg-surface p-4"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">Order #{order.id.slice(-6)}</span>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-sm">
                  {ORDER_STATUS_LABELS[order.status] ?? order.status}
                </span>
                <span className="text-sm text-text-secondary">
                  {new Date(order.createdAt).toLocaleString()}
                </span>
                <span className="font-medium text-primary">${Number(order.totalPrice).toFixed(2)}</span>
              </div>
              {order.user && (
                <p className="text-sm text-text-secondary">Customer: {order.user.name}</p>
              )}
              {order.deliveryAddress && (
                <p className="text-sm text-text-secondary">
                  Delivery: {order.deliveryAddress.street}, {order.deliveryAddress.city}{' '}
                  {order.deliveryAddress.postalCode}
                </p>
              )}
              <ul className="my-2 list-inside list-disc text-sm">
                {(order.items ?? []).map((line, i) => (
                  <li key={i}>
                    {line.quantity}x {line.menuItem?.name ?? 'Item'} — ${Number(line.priceAtOrder ?? 0).toFixed(2)}
                  </li>
                ))}
              </ul>
              {!['COMPLETED', 'CANCELLED'].includes(order.status) && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {STATUS_ORDER.filter(
                    (s) => s !== order.status && !['COMPLETED', 'CANCELLED'].includes(s)
                  ).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => updateStatus(order.id, s)}
                      className="rounded border border-primary bg-white px-3 py-1 text-sm text-primary hover:bg-primary/10"
                    >
                      Set {ORDER_STATUS_LABELS[s]}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => updateStatus(order.id, 'COMPLETED')}
                    className="rounded bg-primary px-3 py-1 text-sm text-white hover:bg-primary/90"
                  >
                    Mark completed
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
