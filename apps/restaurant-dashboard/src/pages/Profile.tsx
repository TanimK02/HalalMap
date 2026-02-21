import { useEffect, useState } from 'react';
import axios from 'axios';
import { api, type Restaurant } from '../api';
import { HALAL_STATUS_LABELS } from '../constants';

export default function Profile() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    phone: '',
    address: '',
    halalStatus: 'CERTIFIED_HALAL' as string,
    certificateUrl: '',
    certificateExpiresAt: '',
    offersPickup: true,
    offersDelivery: false,
  });

  useEffect(() => {
    api
      .get<Restaurant>('/restaurants/me/restaurant')
      .then((r) => {
        const r2 = r.data;
        setRestaurant(r2);
        setForm({
          name: r2.name,
          description: r2.description ?? '',
          phone: r2.phone ?? '',
          address: r2.address,
          halalStatus: r2.halalStatus,
          certificateUrl: r2.certificateUrl ?? '',
          certificateExpiresAt: r2.certificateExpiresAt
            ? new Date(r2.certificateExpiresAt).toISOString().slice(0, 10)
            : '',
          offersPickup: r2.offersPickup,
          offersDelivery: r2.offersDelivery,
        });
      })
      .catch(() => setRestaurant(null))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      if (restaurant) {
        await api.patch('/restaurants/me/restaurant', {
          ...form,
          certificateExpiresAt: form.certificateExpiresAt || undefined,
          certificateUrl: form.certificateUrl || undefined,
        });
      } else {
        await api.post('/restaurants/me/restaurant', {
          ...form,
          certificateExpiresAt: form.certificateExpiresAt || undefined,
          certificateUrl: form.certificateUrl || undefined,
        });
      }
      setMessage('Saved.');
      const { data } = await api.get<Restaurant>('/restaurants/me/restaurant');
      setRestaurant(data);
    } catch (err) {
      setMessage(axios.isAxiosError(err) && err.response?.data?.error ? err.response.data.error : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-text-secondary">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-text-primary">Restaurant profile</h1>
      {restaurant && !restaurant.approved && (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Pending approval. Your restaurant will appear to customers after admin approval.
        </div>
      )}
      {message && (
        <div className={`rounded p-3 text-sm ${message === 'Saved.' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}
      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Phone</label>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Address</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            required
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Halal status</label>
          <select
            value={form.halalStatus}
            onChange={(e) => setForm((f) => ({ ...f, halalStatus: e.target.value }))}
            className="w-full rounded border border-gray-300 px-3 py-2"
          >
            {Object.entries(HALAL_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Certificate URL (optional)</label>
          <input
            type="url"
            value={form.certificateUrl}
            onChange={(e) => setForm((f) => ({ ...f, certificateUrl: e.target.value }))}
            className="w-full rounded border border-gray-300 px-3 py-2"
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Certificate expiry (optional)</label>
          <input
            type="date"
            value={form.certificateExpiresAt}
            onChange={(e) => setForm((f) => ({ ...f, certificateExpiresAt: e.target.value }))}
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.offersPickup}
              onChange={(e) => setForm((f) => ({ ...f, offersPickup: e.target.checked }))}
            />
            <span className="text-sm">Offers pickup</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.offersDelivery}
              onChange={(e) => setForm((f) => ({ ...f, offersDelivery: e.target.checked }))}
            />
            <span className="text-sm">Offers delivery</span>
          </label>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-primary px-4 py-2 font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </form>
    </div>
  );
}
