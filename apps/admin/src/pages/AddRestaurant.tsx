import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { api } from '../api';

const HALAL_STATUS_LABELS: Record<string, string> = {
  CERTIFIED_HALAL: 'Certified Halal',
  MUSLIM_OWNED: 'Muslim-Owned',
  HALAL_FRIENDLY: 'Halal-Friendly',
  PROCLAIMED_HALAL: 'Proclaimed Halal',
  SOME_HALAL: 'Some Halal',
};

const HALAL_STATUS_VALUES = Object.keys(HALAL_STATUS_LABELS);

export default function AddRestaurant() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    restaurantName: '',
    restaurantAddress: '',
    restaurantPhone: '',
    restaurantDescription: '',
    restaurantHalalStatuses: [] as string[],
    restaurantCertificateUrl: '',
    restaurantCertificateExpiresAt: '',
    restaurantOffersPickup: true,
    restaurantOffersDelivery: false,
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    if (name === 'restaurantOffersPickup' || name === 'restaurantOffersDelivery') {
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  }

  function toggleHalalStatus(status: string) {
    setForm((prev) => ({
      ...prev,
      restaurantHalalStatuses: prev.restaurantHalalStatuses.includes(status)
        ? prev.restaurantHalalStatuses.filter((s) => s !== status)
        : [...prev.restaurantHalalStatuses, status],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    setError('');
    setSubmitting(true);
    try {
      await api.post('/admin/restaurants', {
        name: form.name,
        email: form.email,
        password: form.password,
        restaurantName: form.restaurantName,
        restaurantAddress: form.restaurantAddress,
        restaurantPhone: form.restaurantPhone || undefined,
        restaurantDescription: form.restaurantDescription || undefined,
        restaurantHalalStatuses: form.restaurantHalalStatuses,
        restaurantCertificateUrl: form.restaurantCertificateUrl || undefined,
        restaurantCertificateExpiresAt: form.restaurantCertificateExpiresAt || undefined,
        restaurantOffersPickup: form.restaurantOffersPickup,
        restaurantOffersDelivery: form.restaurantOffersDelivery,
      });
      setMessage('Restaurant and owner created. You can approve it from Moderation.');
      setForm({
        name: '',
        email: '',
        password: '',
        restaurantName: '',
        restaurantAddress: '',
        restaurantPhone: '',
        restaurantDescription: '',
        restaurantHalalStatuses: [],
        restaurantCertificateUrl: '',
        restaurantCertificateExpiresAt: '',
        restaurantOffersPickup: true,
        restaurantOffersDelivery: false,
      });
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : axios.isAxiosError(err) && err.response?.data?.errors
            ? (err.response.data.errors as { msg?: string }[]).map((e) => e.msg).join(', ')
            : 'Failed to create restaurant.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function copyPassword() {
    if (form.password) navigator.clipboard.writeText(form.password);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-text-primary">Add restaurant</h1>
      {message && (
        <div className="rounded bg-green-50 p-3 text-sm text-green-800">
          {message} <Link to="/moderation" className="font-medium underline">Go to Moderation</Link>
        </div>
      )}
      {error && <div className="rounded bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="rounded border border-gray-200 bg-surface p-4">
          <h2 className="mb-4 text-lg font-medium text-text-primary">Owner account</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-text-primary">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={form.name}
                onChange={handleChange}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-text-primary">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-text-primary">
                Password (temporary; share with owner so they can log in)
              </label>
              <div className="flex gap-2">
                <input
                  id="password"
                  name="password"
                  type="text"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={handleChange}
                  className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={copyPassword}
                  disabled={!form.password}
                  className="rounded border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded border border-gray-200 bg-surface p-4">
          <h2 className="mb-4 text-lg font-medium text-text-primary">Restaurant</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="restaurantName" className="mb-1 block text-sm font-medium text-text-primary">
                Restaurant name
              </label>
              <input
                id="restaurantName"
                name="restaurantName"
                type="text"
                required
                value={form.restaurantName}
                onChange={handleChange}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="restaurantAddress" className="mb-1 block text-sm font-medium text-text-primary">
                Address
              </label>
              <input
                id="restaurantAddress"
                name="restaurantAddress"
                type="text"
                required
                value={form.restaurantAddress}
                onChange={handleChange}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="restaurantPhone" className="mb-1 block text-sm font-medium text-text-primary">
                Phone (optional)
              </label>
              <input
                id="restaurantPhone"
                name="restaurantPhone"
                type="text"
                value={form.restaurantPhone}
                onChange={handleChange}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="restaurantCertificateUrl" className="mb-1 block text-sm font-medium text-text-primary">
                Certificate URL (optional)
              </label>
              <input
                id="restaurantCertificateUrl"
                name="restaurantCertificateUrl"
                type="url"
                value={form.restaurantCertificateUrl}
                onChange={handleChange}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="restaurantDescription" className="mb-1 block text-sm font-medium text-text-primary">
                Description (optional)
              </label>
              <textarea
                id="restaurantDescription"
                name="restaurantDescription"
                rows={2}
                value={form.restaurantDescription}
                onChange={handleChange}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="restaurantCertificateExpiresAt" className="mb-1 block text-sm font-medium text-text-primary">
                Certificate expiry (optional)
              </label>
              <input
                id="restaurantCertificateExpiresAt"
                name="restaurantCertificateExpiresAt"
                type="date"
                value={form.restaurantCertificateExpiresAt}
                onChange={handleChange}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <span className="mb-2 block text-sm font-medium text-text-primary">Halal statuses (at least one)</span>
              <div className="flex flex-wrap gap-3">
                {HALAL_STATUS_VALUES.map((status) => (
                  <label key={status} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.restaurantHalalStatuses.includes(status)}
                      onChange={() => toggleHalalStatus(status)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{HALAL_STATUS_LABELS[status]}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-6 sm:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="restaurantOffersPickup"
                  checked={form.restaurantOffersPickup}
                  onChange={handleChange}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Offers pickup</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="restaurantOffersDelivery"
                  checked={form.restaurantOffersDelivery}
                  onChange={handleChange}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Offers delivery</span>
              </label>
            </div>
          </div>
        </section>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting || form.restaurantHalalStatuses.length === 0}
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create restaurant and owner'}
          </button>
          <Link
            to="/moderation"
            className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
