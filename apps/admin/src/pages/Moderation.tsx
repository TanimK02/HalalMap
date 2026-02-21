import { useEffect, useState } from 'react';
import axios from 'axios';
import { api } from '../api';

type Restaurant = {
  id: string;
  name: string;
  description: string | null;
  address: string;
  halalStatus: string;
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

  async function setApproved(id: string, approved: boolean) {
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
          restaurants.map((r) => (
            <div key={r.id} className="rounded border border-gray-200 bg-surface p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{r.name}</span>
                <span className={`rounded px-2 py-0.5 text-sm ${r.approved ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                  {r.approved ? 'Approved' : 'Pending'}
                </span>
              </div>
              <p className="text-sm text-text-secondary">{r.description ?? r.address}</p>
              <p className="text-sm text-text-secondary">Halal: {r.halalStatus}</p>
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
              {!r.approved && (
                <div className="mt-3 flex gap-2">
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
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
