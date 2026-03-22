import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  hasPendingTagChanges?: boolean;
  owner: { id: string; name: string; email: string };
  createdAt: string;
};

export default function Restaurants() {
  const [searchParams, setSearchParams] = useSearchParams();
  const detailFromUrl = searchParams.get('detail');

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(detailFromUrl || null);
  const [search, setSearch] = useState('');
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [halalFilter, setHalalFilter] = useState('');
  const [tagReviewOnly, setTagReviewOnly] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get<Restaurant[]>('/admin/restaurants')
      .then((r) => setRestaurants(r.data))
      .catch(() => setRestaurants([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setDetailId(detailFromUrl || null);
  }, [detailFromUrl]);

  function openDetail(id: string) {
    setDetailId(id);
    setSearchParams((p) => {
      p.set('detail', id);
      return p;
    });
  }

  function closeDetail() {
    setDetailId(null);
    setSearchParams((p) => {
      p.delete('detail');
      return p;
    });
  }

  const filtered = useMemo(() => {
    let list = restaurants;
    if (approvalFilter === 'approved') list = list.filter((r) => r.approved);
    if (approvalFilter === 'pending') list = list.filter((r) => !r.approved);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.address.toLowerCase().includes(q) ||
          r.owner?.email?.toLowerCase().includes(q)
      );
    }
    if (halalFilter) {
      list = list.filter((r) => (r.halalStatuses ?? []).includes(halalFilter));
    }
    if (tagReviewOnly) {
      list = list.filter((r) => r.hasPendingTagChanges === true);
    }
    return list;
  }, [restaurants, approvalFilter, search, halalFilter, tagReviewOnly]);

  if (loading) return <div className="text-text-secondary">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-text-primary">Restaurants</h1>
      <div className="flex flex-wrap items-center gap-4">
        <input
          type="search"
          placeholder="Search by name, address, owner email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 min-w-[220px]"
        />
        <div>
          <label className="mr-2 text-sm text-text-secondary">Approval:</label>
          <select
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value as 'all' | 'approved' | 'pending')}
            className="rounded border border-gray-300 px-3 py-2"
          >
            <option value="all">All</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <div>
          <label className="mr-2 text-sm text-text-secondary">Halal:</label>
          <select
            value={halalFilter}
            onChange={(e) => setHalalFilter(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2"
          >
            <option value="">All</option>
            {Object.entries(HALAL_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={tagReviewOnly}
            onChange={(e) => setTagReviewOnly(e.target.checked)}
            className="rounded border-gray-300"
          />
          Tag review pending
        </label>
      </div>
      <div className="overflow-x-auto rounded border border-gray-200 bg-surface">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-text-primary">Name</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-text-primary">Address</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-text-primary">Halal</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-text-primary">Owner</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-text-primary">Status</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-text-primary">Certificate</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-text-primary">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-text-secondary">
                  No restaurants match the filters.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const certStatus = getCertificateStatus(r.certificateExpiresAt);
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-medium text-text-primary">{r.name}</td>
                    <td className="max-w-[200px] truncate px-4 py-2 text-sm text-text-secondary" title={r.address}>
                      {r.address}
                    </td>
                    <td className="px-4 py-2 text-sm text-text-secondary">
                      {(r.halalStatuses ?? []).map((s) => HALAL_STATUS_LABELS[s] ?? s).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-2 text-sm text-text-secondary">{r.owner?.email ?? '—'}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-block w-fit rounded px-2 py-0.5 text-sm ${
                            r.approved ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {r.approved ? 'Approved' : 'Pending'}
                        </span>
                        {r.hasPendingTagChanges === true && (
                          <span className="w-fit rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-900">
                            Tags pending
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      {certStatus.status !== 'none' ? (
                        <span
                          className={`rounded px-2 py-0.5 text-xs ${
                            certStatus.status === 'expired'
                              ? 'bg-red-100 text-red-800'
                              : certStatus.status === 'expiring_soon'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {certStatus.label}
                        </span>
                      ) : (
                        <span className="text-sm text-text-secondary">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => openDetail(r.id)}
                        className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <RestaurantDetailPanel restaurantId={detailId} onClose={closeDetail} />
    </div>
  );
}
