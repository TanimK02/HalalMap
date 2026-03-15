import { useEffect, useState } from 'react';
import axios from 'axios';
import { api } from '../api';

const HALAL_STATUS_LABELS: Record<string, string> = {
  CERTIFIED_HALAL: 'Certified Halal',
  MUSLIM_OWNED: 'Muslim-Owned',
  HALAL_FRIENDLY: 'Halal-Friendly',
  PROCLAIMED_HALAL: 'Proclaimed Halal',
  SOME_HALAL: 'Some Halal',
};

type CertificateStatus = { status: 'expired' | 'expiring_soon' | 'valid' | 'none'; label: string; days?: number };

function getCertificateStatus(certificateExpiresAt: string | null): CertificateStatus {
  if (!certificateExpiresAt) return { status: 'none', label: 'No certificate' };
  const expires = new Date(certificateExpiresAt);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expires.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((expires.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { status: 'expired', label: 'Expired' };
  if (daysLeft <= 30) {
    const label =
      daysLeft === 0 ? 'Expires today' : daysLeft === 1 ? 'Expires in 1 day' : `Expires in ${daysLeft} days`;
    return { status: 'expiring_soon', label, days: daysLeft };
  }
  return { status: 'valid', label: 'Valid' };
}

type Restaurant = {
  id: string;
  name: string;
  description: string | null;
  address: string;
  halalStatuses: string[];
  certificateUrl: string | null;
  certificateExpiresAt: string | null;
  approved: boolean;
  owner: { id: string; name: string; email: string };
  createdAt: string;
};

type MenuItem = { id: string; name: string };
type MenuCategory = { id: string; name: string; items: MenuItem[] };
type RestaurantDetail = Restaurant & {
  phone: string | null;
  offersPickup: boolean;
  offersDelivery: boolean;
  menuCategories?: MenuCategory[];
};

export default function Moderation() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending'>('pending');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<RestaurantDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  function load() {
    const params = filter === 'pending' ? { pending: 'true' } : {};
    api
      .get<Restaurant[]>('/admin/restaurants', { params })
      .then((r) => setRestaurants(r.data))
      .catch(() => setRestaurants([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setLoading(true);
    load();
  }, [filter]);

  useEffect(() => {
    if (!detailId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    api
      .get<RestaurantDetail>(`/admin/restaurants/${detailId}`)
      .then((r) => setDetail(r.data))
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [detailId]);

  useEffect(() => {
    if (!detailId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDetailId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detailId]);

  async function setApproved(id: string, approved: boolean) {
    setMessage('');
    try {
      await api.patch(`/admin/restaurants/${id}/approve`, { approved });
      setMessage(approved ? 'Restaurant approved.' : 'Restaurant rejected.');
      load();
      if (id === detailId) {
        setDetail((prev) => (prev ? { ...prev, approved } : null));
      }
    } catch (err) {
      setMessage(axios.isAxiosError(err) && err.response?.data?.error ? err.response.data.error : 'Failed');
    }
  }

  if (loading) return <div className="text-text-secondary">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-text-primary">Moderation</h1>
      {message && (
        <div className="rounded bg-green-50 p-3 text-sm text-green-800">{message}</div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setFilter('pending')}
          className={`rounded px-3 py-1.5 text-sm ${filter === 'pending' ? 'bg-primary text-white' : 'border border-gray-300 bg-white'}`}
        >
          Pending
        </button>
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`rounded px-3 py-1.5 text-sm ${filter === 'all' ? 'bg-primary text-white' : 'border border-gray-300 bg-white'}`}
        >
          All
        </button>
      </div>
      <div className="space-y-4">
        {restaurants.length === 0 ? (
          <p className="text-text-secondary">No restaurants.</p>
        ) : (
          restaurants.map((r) => {
            const certStatus = getCertificateStatus(r.certificateExpiresAt);
            return (
              <div key={r.id} className="rounded border border-gray-200 bg-surface p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{r.name}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {certStatus.status !== 'none' && (
                      <span
                        className={`rounded px-2 py-0.5 text-sm ${
                          certStatus.status === 'expired'
                            ? 'bg-red-100 text-red-800'
                            : certStatus.status === 'expiring_soon'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {certStatus.label}
                      </span>
                    )}
                    <span className={`rounded px-2 py-0.5 text-sm ${r.approved ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                      {r.approved ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-text-secondary">{r.description ?? r.address}</p>
                <p className="text-sm text-text-secondary">
                  Halal: {(r.halalStatuses ?? []).map((s) => HALAL_STATUS_LABELS[s] ?? s).join(', ') || '—'}
                </p>
                <p className="text-sm text-text-secondary">Owner: {r.owner?.email}</p>
                {r.certificateUrl && (
                  <p className="text-sm">
                    <a href={r.certificateUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                      View certificate
                    </a>
                    {r.certificateExpiresAt && (
                      <span className="ml-2 text-text-secondary">
                        Expires: {new Date(r.certificateExpiresAt).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setDetailId(r.id)}
                    className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
                  >
                    View
                  </button>
                  {!r.approved && (
                    <>
                      <button
                        type="button"
                        onClick={() => setApproved(r.id, true)}
                        className="rounded bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary/90"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => setApproved(r.id, false)}
                        className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Restaurant detail side panel */}
      {detailId != null && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-panel-title"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDetailId(null)}
          />
          <div className="relative z-10 flex w-full max-w-md flex-col border-l border-gray-200 bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
              <h2 id="detail-panel-title" className="text-lg font-semibold text-text-primary">
                Restaurant detail
              </h2>
              <button
                type="button"
                onClick={() => setDetailId(null)}
                className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {detailLoading ? (
                <p className="text-text-secondary">Loading...</p>
              ) : detail ? (
                <div className="space-y-4">
                  <div>
                    <p className="font-medium text-text-primary">{detail.name}</p>
                    <span className={`mt-1 inline-block rounded px-2 py-0.5 text-sm ${detail.approved ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                      {detail.approved ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                  {detail.description && <p className="text-sm text-text-secondary">{detail.description}</p>}
                  <p className="text-sm text-text-secondary">
                    <span className="font-medium text-text-primary">Address:</span> {detail.address}
                  </p>
                  {detail.phone && (
                    <p className="text-sm text-text-secondary">
                      <span className="font-medium text-text-primary">Phone:</span> {detail.phone}
                    </p>
                  )}
                  <p className="text-sm text-text-secondary">
                    <span className="font-medium text-text-primary">Halal:</span>{' '}
                    {(detail.halalStatuses ?? []).map((s) => HALAL_STATUS_LABELS[s] ?? s).join(', ') || '—'}
                  </p>
                  <p className="text-sm text-text-secondary">
                    <span className="font-medium text-text-primary">Pickup:</span> {detail.offersPickup ? 'Yes' : 'No'} ·{' '}
                    <span className="font-medium text-text-primary">Delivery:</span> {detail.offersDelivery ? 'Yes' : 'No'}
                  </p>
                  <div>
                    <p className="mb-1 text-sm font-medium text-text-primary">Owner</p>
                    <p className="text-sm text-text-secondary">{detail.owner?.name} — {detail.owner?.email}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-sm font-medium text-text-primary">Certificate</p>
                    {detail.certificateUrl ? (
                      <p className="text-sm">
                        <a href={detail.certificateUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                          View certificate
                        </a>
                        {detail.certificateExpiresAt && (
                          <>
                            <span className="ml-2 text-text-secondary">
                              Expires: {new Date(detail.certificateExpiresAt).toLocaleDateString()}
                            </span>
                            {(() => {
                              const s = getCertificateStatus(detail.certificateExpiresAt);
                              if (s.status !== 'none') {
                                return (
                                  <span
                                    className={`ml-2 rounded px-2 py-0.5 text-xs ${
                                      s.status === 'expired' ? 'bg-red-100 text-red-800' : s.status === 'expiring_soon' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                                    }`}
                                  >
                                    {s.label}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </>
                        )}
                      </p>
                    ) : (
                      <p className="text-sm text-text-secondary">No certificate</p>
                    )}
                  </div>
                  {detail.menuCategories && detail.menuCategories.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-medium text-text-primary">Menu summary</p>
                      <ul className="space-y-2">
                        {detail.menuCategories.map((cat) => (
                          <li key={cat.id} className="rounded border border-gray-200 bg-gray-50 p-2">
                            <p className="text-sm font-medium text-text-primary">{cat.name}</p>
                            <p className="text-xs text-text-secondary">
                              {cat.items.length} item{cat.items.length !== 1 ? 's' : ''}
                              {cat.items.length > 0 && `: ${cat.items.map((i) => i.name).join(', ')}`}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!detail.approved && (
                    <div className="flex gap-2 border-t border-gray-200 pt-4">
                      <button
                        type="button"
                        onClick={() => setApproved(detail.id, true)}
                        className="rounded bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary/90"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => setApproved(detail.id, false)}
                        className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-text-secondary">Failed to load restaurant.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
