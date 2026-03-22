import { useEffect, useState } from 'react';
import axios from 'axios';
import { api } from '../api';
import { useConfig } from '../ConfigContext';

export const HALAL_STATUS_LABELS: Record<string, string> = {
  CERTIFIED_HALAL: 'Certified Halal',
  MUSLIM_OWNED: 'Muslim-Owned',
  HALAL_FRIENDLY: 'Halal-Friendly',
  PROCLAIMED_HALAL: 'Proclaimed Halal',
  SOME_HALAL: 'Some Halal',
};

type CertificateStatus = { status: 'expired' | 'expiring_soon' | 'valid' | 'none'; label: string; days?: number };

export function getCertificateStatus(certificateExpiresAt: string | null): CertificateStatus {
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

type MenuItem = { id: string; name: string };
type MenuCategory = { id: string; name: string; items: MenuItem[] };

export type TagWithActive = {
  id: string;
  slug: string;
  label: string;
  sortOrder: number;
  active: boolean;
};

export type RestaurantDetail = {
  id: string;
  name: string;
  description: string | null;
  address: string;
  phone: string | null;
  halalStatuses: string[];
  certificateUrl: string | null;
  certificateExpiresAt: string | null;
  approved: boolean;
  offersPickup: boolean;
  offersDelivery: boolean;
  hasPendingTagChanges?: boolean;
  owner: { id: string; name: string; email: string };
  menuCategories?: MenuCategory[];
  publishedTags?: TagWithActive[];
  draftTags?: TagWithActive[];
};

type Props = {
  restaurantId: string | null;
  onClose: () => void;
  showApproveButtons?: boolean;
  onApproved?: (id: string, approved: boolean) => void;
  onDetailUpdated?: (detail: RestaurantDetail) => void;
  /** Called after admin approve / decline / override of restaurant tags (not on initial panel load). */
  onRestaurantTagsChanged?: () => void;
};

export default function RestaurantDetailPanel({
  restaurantId,
  onClose,
  showApproveButtons = false,
  onApproved,
  onDetailUpdated,
  onRestaurantTagsChanged,
}: Props) {
  const { enableDelivery } = useConfig();
  const [detail, setDetail] = useState<RestaurantDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [adminTagCatalog, setAdminTagCatalog] = useState<TagWithActive[]>([]);
  const [publishedEditorIds, setPublishedEditorIds] = useState<string[]>([]);
  const [tagActionMessage, setTagActionMessage] = useState('');
  const [tagBusy, setTagBusy] = useState(false);

  useEffect(() => {
    if (!restaurantId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    api
      .get<RestaurantDetail>(`/admin/restaurants/${restaurantId}`, { signal: controller.signal })
      .then((r) => {
        if (!cancelled) {
          const d = r.data as RestaurantDetail;
          setDetail(d);
          setPublishedEditorIds((d.publishedTags ?? []).filter((t) => t.active).map((t) => t.id));
          setTagActionMessage('');
          onDetailUpdated?.(d);
        }
      })
      .catch((err) => {
        if (!cancelled && err.code !== 'ERR_CANCELED') setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) {
      setAdminTagCatalog([]);
      return;
    }
    api
      .get<TagWithActive[]>('/admin/tags')
      .then((r) => setAdminTagCatalog(r.data))
      .catch(() => setAdminTagCatalog([]));
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [restaurantId, onClose]);

  async function handleSetApproved(id: string, approved: boolean) {
    if (!onApproved) return;
    try {
      await api.patch(`/admin/restaurants/${id}/approve`, { approved });
      setDetail((prev) => (prev ? { ...prev, approved } : null));
      onApproved(id, approved);
    } catch {
      // leave detail as-is; caller can show error
    }
  }

  async function handleApproveTags() {
    if (!detail) return;
    setTagBusy(true);
    setTagActionMessage('');
    try {
      const { data } = await api.post<RestaurantDetail>(`/admin/restaurants/${detail.id}/tags/approve`);
      setDetail(data);
      setPublishedEditorIds((data.publishedTags ?? []).filter((t) => t.active).map((t) => t.id));
      onDetailUpdated?.(data);
      onRestaurantTagsChanged?.();
      setTagActionMessage('Tags approved.');
    } catch (err) {
      setTagActionMessage(
        axios.isAxiosError(err) && err.response?.data?.error ? err.response.data.error : 'Failed to approve tags'
      );
    } finally {
      setTagBusy(false);
    }
  }

  async function handleDeclineTags() {
    if (!detail) return;
    setTagBusy(true);
    setTagActionMessage('');
    try {
      const { data } = await api.post<RestaurantDetail>(`/admin/restaurants/${detail.id}/tags/decline`);
      setDetail(data);
      setPublishedEditorIds((data.publishedTags ?? []).filter((t) => t.active).map((t) => t.id));
      onDetailUpdated?.(data);
      onRestaurantTagsChanged?.();
      setTagActionMessage('Tag proposal declined.');
    } catch (err) {
      setTagActionMessage(
        axios.isAxiosError(err) && err.response?.data?.error ? err.response.data.error : 'Failed to decline tags'
      );
    } finally {
      setTagBusy(false);
    }
  }

  async function handleApplyPublishedTags() {
    if (!detail) return;
    setTagBusy(true);
    setTagActionMessage('');
    try {
      const { data } = await api.patch<RestaurantDetail>(`/admin/restaurants/${detail.id}/tags`, {
        tagIds: publishedEditorIds,
      });
      setDetail(data);
      setPublishedEditorIds((data.publishedTags ?? []).filter((t) => t.active).map((t) => t.id));
      onDetailUpdated?.(data);
      onRestaurantTagsChanged?.();
      setTagActionMessage('Published tags updated.');
    } catch (err) {
      setTagActionMessage(
        axios.isAxiosError(err) && err.response?.data?.error ? err.response.data.error : 'Failed to update tags'
      );
    } finally {
      setTagBusy(false);
    }
  }

  if (restaurantId == null) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-panel-title"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 flex w-full max-w-md flex-col border-l border-gray-200 bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 id="detail-panel-title" className="text-lg font-semibold text-text-primary">
            Restaurant detail
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-text-secondary">Loading...</p>
          ) : detail ? (
            <div className="space-y-4">
              <div>
                <p className="font-medium text-text-primary">{detail.name}</p>
                <span
                  className={`mt-1 inline-block rounded px-2 py-0.5 text-sm ${
                    detail.approved ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
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
              <div className="rounded border border-gray-200 bg-gray-50 p-3 space-y-2">
                <p className="text-sm font-medium text-text-primary">Restaurant tags</p>
                <p className="text-xs text-text-secondary">
                  Live (customers see):{' '}
                  {(detail.publishedTags ?? []).filter((t) => t.active).map((t) => t.label).join(', ') || '—'}
                </p>
                {detail.hasPendingTagChanges === true && (
                  <>
                    <p className="text-xs text-amber-800">
                      Owner proposal:{' '}
                      {(detail.draftTags ?? []).length > 0
                        ? (detail.draftTags ?? []).map((t) => t.label).join(', ')
                        : '(remove all tags)'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={tagBusy}
                        onClick={() => void handleApproveTags()}
                        className="rounded bg-primary px-2 py-1 text-xs text-white hover:bg-primary/90 disabled:opacity-50"
                      >
                        Approve tags
                      </button>
                      <button
                        type="button"
                        disabled={tagBusy}
                        onClick={() => void handleDeclineTags()}
                        className="rounded border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
                      >
                        Decline proposal
                      </button>
                    </div>
                  </>
                )}
                <p className="text-xs font-medium text-text-primary pt-1">Set published tags (override)</p>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {adminTagCatalog
                    .filter((t) => t.active)
                    .map((tag) => (
                      <label key={tag.id} className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={publishedEditorIds.includes(tag.id)}
                          disabled={tagBusy}
                          onChange={(e) => {
                            setPublishedEditorIds((prev) =>
                              e.target.checked ? [...prev, tag.id] : prev.filter((id) => id !== tag.id)
                            );
                          }}
                          className="rounded border-gray-300"
                        />
                        {tag.label}
                      </label>
                    ))}
                </div>
                <button
                  type="button"
                  disabled={tagBusy}
                  onClick={() => void handleApplyPublishedTags()}
                  className="rounded border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
                >
                  Apply published tags
                </button>
                {tagActionMessage && (
                  <p className="text-xs text-text-secondary">{tagActionMessage}</p>
                )}
              </div>
              <p className="text-sm text-text-secondary">
                <span className="font-medium text-text-primary">Pickup:</span> {detail.offersPickup ? 'Yes' : 'No'}
                {' · '}
                <span className="font-medium text-text-primary">Delivery:</span>{' '}
                {enableDelivery ? (detail.offersDelivery ? 'Yes' : 'No') : 'No (disabled app-wide)'}
              </p>
              <div>
                <p className="mb-1 text-sm font-medium text-text-primary">Owner</p>
                <p className="text-sm text-text-secondary">
                  {detail.owner?.name} — {detail.owner?.email}
                </p>
              </div>
              <div>
                <p className="mb-1 text-sm font-medium text-text-primary">Certificate</p>
                {detail.certificateUrl ? (
                  <p className="text-sm">
                    <a
                      href={detail.certificateUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline"
                    >
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
                                  s.status === 'expired'
                                    ? 'bg-red-100 text-red-800'
                                    : s.status === 'expiring_soon'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-green-100 text-green-800'
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
              {showApproveButtons && !detail.approved && onApproved && (
                <div className="flex gap-2 border-t border-gray-200 pt-4">
                  <button
                    type="button"
                    onClick={() => handleSetApproved(detail.id, true)}
                    className="rounded bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary/90"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetApproved(detail.id, false)}
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
  );
}
