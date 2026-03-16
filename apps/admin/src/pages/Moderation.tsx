import { useEffect, useState } from 'react';
import axios from 'axios';
import { api } from '../api';
import RestaurantDetailPanel, { getCertificateStatus, HALAL_STATUS_LABELS } from '../components/RestaurantDetailPanel';

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

export default function Moderation() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending'>('pending');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);

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

  function onApproved(id: string, approved: boolean) {
    setMessage(approved ? 'Restaurant approved.' : 'Restaurant rejected.');
    load();
  }

  async function setApprovedFromList(id: string, approved: boolean) {
    setMessage('');
    try {
      await api.patch(`/admin/restaurants/${id}/approve`, { approved });
      setMessage(approved ? 'Restaurant approved.' : 'Restaurant rejected.');
      load();
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
                        onClick={() => setApprovedFromList(r.id, true)}
                        className="rounded bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary/90"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => setApprovedFromList(r.id, false)}
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

      <RestaurantDetailPanel
        restaurantId={detailId}
        onClose={() => setDetailId(null)}
        showApproveButtons
        onApproved={onApproved}
      />
    </div>
  );
}
