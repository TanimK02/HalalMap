import { useEffect, useState } from 'react';
import axios from 'axios';
import { api, type Restaurant, type RestaurantTag, type BusinessHoursMap } from '../api';
import { useConfig } from '../ConfigContext';
import { HALAL_STATUS_LABELS } from '../constants';

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

type CertificateStatus = { status: 'expired' | 'expiring_soon' | 'valid' | 'none'; label: string };
function getCertificateStatus(certificateExpiresAt: string | null): CertificateStatus {
  if (!certificateExpiresAt) return { status: 'none', label: 'No certificate' };
  const expires = new Date(certificateExpiresAt);
  if (Number.isNaN(expires.getTime())) return { status: 'none', label: 'Invalid expiry date' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expires.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((expires.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { status: 'expired', label: 'Expired' };
  if (daysLeft <= 30) {
    const label =
      daysLeft === 0 ? 'Expires today' : daysLeft === 1 ? 'Expires in 1 day' : `Expires in ${daysLeft} days`;
    return { status: 'expiring_soon', label };
  }
  return { status: 'valid', label: 'Valid' };
}
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
  const { enableDelivery, stripeConnectEnabled } = useConfig();
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
  });
  const [tagCatalog, setTagCatalog] = useState<RestaurantTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagSaving, setTagSaving] = useState(false);

  useEffect(() => {
    api
      .get<RestaurantTag[]>('/tags')
      .then((r) => setTagCatalog(r.data))
      .catch(() => setTagCatalog([]));
  }, []);

  useEffect(() => {
    api
      .get<Restaurant>('/restaurants/me/restaurant')
      .then((r) => {
        const r2 = r.data;
        setRestaurant(r2);
        setSelectedTagIds((r2.draftTags ?? r2.publishedTags ?? []).map((t) => t.id));
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
      setSelectedTagIds((data.draftTags ?? data.publishedTags ?? []).map((t) => t.id));
    } catch (err) {
      setMessage(axios.isAxiosError(err) && err.response?.data?.error ? err.response.data.error : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function saveTags() {
    setTagSaving(true);
    setMessage('');
    try {
      const { data } = await api.put<Restaurant>('/restaurants/me/restaurant/tags', {
        tagIds: selectedTagIds,
      });
      setRestaurant(data);
      setSelectedTagIds((data.draftTags ?? data.publishedTags ?? []).map((t) => t.id));
      setMessage(
        data.hasPendingTagChanges
          ? 'Tags submitted. Waiting for admin approval before they appear to customers.'
          : 'Tags are up to date.'
      );
    } catch (err) {
      setMessage(
        axios.isAxiosError(err) && err.response?.data?.error ? err.response.data.error : 'Failed to save tags'
      );
    } finally {
      setTagSaving(false);
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
      {restaurant?.hasPendingTagChanges && (
        <div className="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          Tag changes are waiting for admin approval. Customers still see your current published tags until
          then.
        </div>
      )}
      {stripeConnectEnabled && restaurant && (
        <div className="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 space-y-2">
          <div className="flex flex-col gap-1">
            <span className="font-medium">Payouts via Stripe</span>
            <span>
              Status:{' '}
              <span className="font-mono">
                {restaurant.stripeConnectStatus ?? 'UNINITIALIZED'}
              </span>
            </span>
            {restaurant.stripeConnectStatus !== 'ACTIVE' && (
              <span>
                You need to finish Stripe setup to receive payouts directly to your bank
                account.
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  const { data } = await api.post<{ url: string }>(
                    '/restaurants/me/stripe/connect/link'
                  );
                  window.location.href = data.url;
                } catch (err) {
                  setMessage(
                    axios.isAxiosError(err) && err.response?.data?.error
                      ? err.response.data.error
                      : 'Failed to start Stripe onboarding'
                  );
                }
              }}
              className="inline-flex items-center rounded bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90"
            >
              {restaurant.stripeConnectStatus === 'ACTIVE'
                ? 'Update payout details'
                : 'Set up payouts with Stripe'}
            </button>
          </div>
        </div>
      )}
      {restaurant?.certificateExpiresAt && (() => {
        const cert = getCertificateStatus(restaurant.certificateExpiresAt);
        if (cert.status === 'expired') {
          return (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              Certificate has expired. Please update the certificate expiry date below so customers can see your current certification.
            </div>
          );
        }
        if (cert.status === 'expiring_soon') {
          return (
            <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Certificate {cert.label.toLowerCase()}. Consider updating the certificate expiry date below.
            </div>
          );
        }
        return null;
      })()}
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
        <div className="rounded border border-gray-200 bg-surface p-4 space-y-3">
          <div>
            <h2 className="text-sm font-medium text-text-primary">Restaurant tags</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Choose tags that describe your cuisine or style. Updates appear to customers only after an
              admin approves them.
            </p>
          </div>
          {tagCatalog.length === 0 ? (
            <p className="text-sm text-text-secondary">No tags available yet.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {tagCatalog.map((tag) => (
                <label key={tag.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedTagIds.includes(tag.id)}
                    onChange={(e) => {
                      setSelectedTagIds((prev) =>
                        e.target.checked ? [...prev, tag.id] : prev.filter((id) => id !== tag.id)
                      );
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{tag.label}</span>
                </label>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => void saveTags()}
            disabled={tagSaving || !restaurant}
            className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {tagSaving ? 'Saving…' : 'Save tags'}
          </button>
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

        <div className="rounded border border-gray-200 bg-surface p-4 space-y-2">
          <h2 className="font-medium text-text-primary">Pickup and delivery fees</h2>
          <p className="text-sm text-text-secondary">
            Service fees for pickup and delivery are set by the platform. Contact support if you need a change.
          </p>
          {restaurant && (
            <ul className="text-sm text-text-secondary list-disc pl-5 space-y-1">
              <li>
                Pickup:{' '}
                {restaurant.pickupFeeType && restaurant.pickupFeeValue != null
                  ? restaurant.pickupFeeType === 'FLAT'
                    ? `$${(restaurant.pickupFeeValue / 100).toFixed(2)} flat`
                    : `${restaurant.pickupFeeValue}%`
                  : 'Platform default'}
              </li>
              {enableDelivery && (
                <li>
                  Delivery:{' '}
                  {restaurant.deliveryFeeType && restaurant.deliveryFeeValue != null
                    ? restaurant.deliveryFeeType === 'FLAT'
                      ? `$${(restaurant.deliveryFeeValue / 100).toFixed(2)} flat`
                      : `${restaurant.deliveryFeeValue}%`
                    : 'Platform default'}
                </li>
              )}
            </ul>
          )}
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
