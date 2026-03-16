import { useEffect, useState } from 'react';
import axios from 'axios';
import { api, type Restaurant, type BusinessHoursMap } from '../api';
import { useConfig } from '../ConfigContext';
import { HALAL_STATUS_LABELS } from '../constants';

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const DAY_LABELS: Record<(typeof DAY_KEYS)[number], string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

function parseBusinessHoursForForm(h: BusinessHoursMap | null | undefined): Record<string, { open: string; close: string }> {
  const out: Record<string, { open: string; close: string }> = {};
  for (const key of DAY_KEYS) {
    const day = h && typeof h[key] === 'object' && h[key] != null ? (h[key] as { open?: string; close?: string }) : null;
    out[key] = {
      open: typeof day?.open === 'string' ? day.open : '',
      close: typeof day?.close === 'string' ? day.close : '',
    };
  }
  return out;
}

function buildBusinessHoursPayload(formHours: Record<string, { open: string; close: string }>): BusinessHoursMap {
  const out: BusinessHoursMap = {};
  for (const key of DAY_KEYS) {
    const day = formHours[key];
    if (day && day.open.trim() !== '' && day.close.trim() !== '') {
      out[key] = { open: day.open.trim(), close: day.close.trim() };
    }
  }
  return out;
}

export default function Profile() {
  const { enableDelivery } = useConfig();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    phone: '',
    address: '',
    halalStatuses: ['CERTIFIED_HALAL'] as string[],
    certificateUrl: '',
    certificateExpiresAt: '',
    offersPickup: true,
    offersDelivery: false,
    businessHours: parseBusinessHoursForForm(null),
    pickupFeeType: '' as '' | 'FLAT' | 'PERCENT',
    pickupFeeValue: 0,
    deliveryFeeType: '' as '' | 'FLAT' | 'PERCENT',
    deliveryFeeValue: 0,
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
          halalStatuses: Array.isArray(r2.halalStatuses) && r2.halalStatuses.length > 0 ? r2.halalStatuses : ['CERTIFIED_HALAL'],
          certificateUrl: r2.certificateUrl ?? '',
          certificateExpiresAt: r2.certificateExpiresAt
            ? new Date(r2.certificateExpiresAt).toISOString().slice(0, 10)
            : '',
          offersPickup: r2.offersPickup,
          offersDelivery: r2.offersDelivery,
          businessHours: parseBusinessHoursForForm(r2.businessHours),
          pickupFeeType: (r2.pickupFeeType as '' | 'FLAT' | 'PERCENT') ?? '',
          pickupFeeValue: r2.pickupFeeValue ?? 0,
          deliveryFeeType: (r2.deliveryFeeType as '' | 'FLAT' | 'PERCENT') ?? '',
          deliveryFeeValue: r2.deliveryFeeValue ?? 0,
        });
      })
      .catch(() => setRestaurant(null))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.halalStatuses.length === 0) {
      setMessage('Select at least one halal status.');
      return;
    }
    setSaving(true);
    setMessage('');
    const businessHoursPayload = buildBusinessHoursPayload(form.businessHours);
    try {
      if (restaurant) {
        await api.patch('/restaurants/me/restaurant', {
          ...form,
          halalStatuses: form.halalStatuses,
          certificateExpiresAt: form.certificateExpiresAt || undefined,
          certificateUrl: form.certificateUrl || undefined,
          businessHours: Object.keys(businessHoursPayload).length > 0 ? businessHoursPayload : null,
          pickupFeeType: form.pickupFeeType || null,
          pickupFeeValue: form.pickupFeeType ? form.pickupFeeValue : null,
          deliveryFeeType: form.deliveryFeeType || null,
          deliveryFeeValue: form.deliveryFeeType ? form.deliveryFeeValue : null,
        });
      } else {
        await api.post('/restaurants/me/restaurant', {
          ...form,
          halalStatuses: form.halalStatuses,
          certificateExpiresAt: form.certificateExpiresAt || undefined,
          certificateUrl: form.certificateUrl || undefined,
          businessHours: Object.keys(businessHoursPayload).length > 0 ? businessHoursPayload : undefined,
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
          <label className="mb-1 block text-sm font-medium">Halal status (select all that apply)</label>
          <div className="flex flex-wrap gap-3">
            {Object.entries(HALAL_STATUS_LABELS).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.halalStatuses.includes(value)}
                  onChange={(e) => {
                    setForm((f) => ({
                      ...f,
                      halalStatuses: e.target.checked
                        ? [...f.halalStatuses, value]
                        : f.halalStatuses.filter((s) => s !== value),
                    }));
                  }}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
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
          {enableDelivery && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.offersDelivery}
                onChange={(e) => setForm((f) => ({ ...f, offersDelivery: e.target.checked }))}
              />
              <span className="text-sm">Offers delivery</span>
            </label>
          )}
        </div>

        <div className="rounded border border-gray-200 bg-surface p-4 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="font-medium text-text-primary">Business hours</h2>
            <button
              type="button"
              onClick={() => {
                const firstOpen = DAY_KEYS.find(
                  (key) => form.businessHours[key].open.trim() !== '' && form.businessHours[key].close.trim() !== ''
                );
                if (firstOpen == null) {
                  setMessage('Set at least one day with open and close times to copy.');
                  return;
                }
                const { open, close } = form.businessHours[firstOpen];
                setForm((f) => ({
                  ...f,
                  businessHours: (() => {
                    const next = { ...f.businessHours };
                    for (const key of DAY_KEYS) {
                      next[key] = { open, close };
                    }
                    return next;
                  })(),
                }));
                setMessage('');
              }}
              className="text-sm text-primary hover:underline"
            >
              Copy to all days
            </button>
          </div>
          <p className="text-sm text-text-secondary">Set open and close times (24h). Leave empty or mark Closed for days you are closed.</p>
          <div className="space-y-3">
            {DAY_KEYS.map((key) => {
              const day = form.businessHours[key];
              const isClosed = day.open.trim() === '' && day.close.trim() === '';
              return (
                <div key={key} className="flex flex-wrap items-center gap-3 gap-y-2">
                  <span className="w-24 text-sm font-medium text-text-primary">{DAY_LABELS[key]}</span>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={isClosed}
                      onChange={(e) => {
                        setForm((f) => ({
                          ...f,
                          businessHours: {
                            ...f.businessHours,
                            [key]: e.target.checked ? { open: '', close: '' } : { open: '09:00', close: '21:00' },
                          },
                        }));
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-text-secondary">Closed</span>
                  </label>
                  {!isClosed && (
                    <>
                      <input
                        type="time"
                        value={day.open || '09:00'}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            businessHours: { ...f.businessHours, [key]: { ...f.businessHours[key], open: e.target.value } },
                          }))
                        }
                        className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                        aria-label={`${DAY_LABELS[key]} open`}
                      />
                      <span className="text-sm text-text-secondary">to</span>
                      <input
                        type="time"
                        value={day.close || '21:00'}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            businessHours: { ...f.businessHours, [key]: { ...f.businessHours[key], close: e.target.value } },
                          }))
                        }
                        className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                        aria-label={`${DAY_LABELS[key]} close`}
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded border border-gray-200 bg-surface p-4 space-y-4">
          <h2 className="font-medium text-text-primary">Fee overrides (optional)</h2>
          <p className="text-sm text-text-secondary">Leave as &quot;Use platform default&quot; to use app-wide defaults. Set a flat amount (cents) or percentage to override for your restaurant.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Pickup fee</label>
              <select
                value={form.pickupFeeType}
                onChange={(e) => setForm((f) => ({ ...f, pickupFeeType: e.target.value as '' | 'FLAT' | 'PERCENT' }))}
                className="w-full rounded border border-gray-300 px-3 py-2"
              >
                <option value="">Use platform default</option>
                <option value="FLAT">Flat amount (cents)</option>
                <option value="PERCENT">Percentage</option>
              </select>
              {(form.pickupFeeType === 'FLAT' || form.pickupFeeType === 'PERCENT') && (
                <input
                  type="number"
                  min="0"
                  step={form.pickupFeeType === 'PERCENT' ? 1 : 1}
                  value={form.pickupFeeValue}
                  onChange={(e) => setForm((f) => ({ ...f, pickupFeeValue: Number(e.target.value) || 0 }))}
                  placeholder={form.pickupFeeType === 'FLAT' ? 'e.g. 299 for $2.99' : 'e.g. 10 for 10%'}
                  className="mt-2 w-full rounded border border-gray-300 px-3 py-2"
                />
              )}
            </div>
            {enableDelivery && (
              <div>
                <label className="mb-1 block text-sm font-medium">Delivery fee</label>
                <select
                  value={form.deliveryFeeType}
                  onChange={(e) => setForm((f) => ({ ...f, deliveryFeeType: e.target.value as '' | 'FLAT' | 'PERCENT' }))}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                >
                  <option value="">Use platform default</option>
                  <option value="FLAT">Flat amount (cents)</option>
                  <option value="PERCENT">Percentage</option>
                </select>
                {(form.deliveryFeeType === 'FLAT' || form.deliveryFeeType === 'PERCENT') && (
                  <input
                    type="number"
                    min="0"
                    step={form.deliveryFeeType === 'PERCENT' ? 1 : 1}
                    value={form.deliveryFeeValue}
                    onChange={(e) => setForm((f) => ({ ...f, deliveryFeeValue: Number(e.target.value) || 0 }))}
                    placeholder={form.deliveryFeeType === 'FLAT' ? 'e.g. 299 for $2.99' : 'e.g. 10 for 10%'}
                    className="mt-2 w-full rounded border border-gray-300 px-3 py-2"
                  />
                )}
              </div>
            )}
          </div>
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
