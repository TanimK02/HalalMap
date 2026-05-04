import { useEffect, useState } from 'react';
import axios from 'axios';
import { api, uploadMenuItemImage, type Restaurant, type MenuCategory, type MenuItem } from '../api';
import { useConfig } from '../ConfigContext';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPT_IMAGES = 'image/jpeg,image/png,image/webp,image/gif';

/** Restrict input to price format: digits, optional decimal, max 2 decimal places (e.g. 12, 12.99, 12.1, 12.10). */
function formatPriceInput(value: string): string {
  let s = value.replace(/[^\d.]/g, '');
  const parts = s.split('.');
  if (parts.length > 2) {
    s = parts[0] + '.' + parts.slice(1).join('').slice(0, 2);
  } else if (parts.length === 2 && parts[1].length > 2) {
    s = parts[0] + '.' + parts[1].slice(0, 2);
  }
  return s;
}

/** Add-item form draft; `price` is the raw input string until submit. */
type NewMenuItemDraft = Partial<Omit<MenuItem, 'price'>> & { categoryId?: string; price?: string };

export default function Menu() {
  const { enableDelivery } = useConfig();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newItem, setNewItem] = useState<NewMenuItemDraft>({});
  const [editItemForm, setEditItemForm] = useState<{ name: string; description: string; price: string; imageUrl: string }>({ name: '', description: '', price: '', imageUrl: '' });
  const [reordering, setReordering] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<'add' | 'edit' | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function load() {
    api
      .get<Restaurant>('/restaurants/me/restaurant')
      .then((r) => setRestaurant(r.data))
      .catch(() => setRestaurant(null))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function addCategory() {
    if (!newCategoryName.trim()) return;
    try {
      await api.post('/restaurants/me/restaurant/categories', { name: newCategoryName.trim() });
      setNewCategoryName('');
      load();
    } catch (e) {
      console.error(e);
    }
  }

  async function updateCategory(id: string, name: string) {
    try {
      await api.patch(`/restaurants/me/restaurant/categories/${id}`, { name });
      setEditingCategory(null);
      load();
    } catch (e) {
      console.error(e);
    }
  }

  async function deleteCategory(id: string) {
    if (!confirm('Delete this category and all its items?')) return;
    try {
      await api.delete(`/restaurants/me/restaurant/categories/${id}`);
      load();
    } catch (e) {
      console.error(e);
    }
  }

  async function addItem(categoryId: string) {
    const { name, description, price, imageUrl, availableForPickup, availableForDelivery } = newItem;
    const priceNum = price === undefined || price === '' ? null : Number(price);
    if (!name?.trim() || priceNum == null || Number.isNaN(priceNum) || priceNum < 0) return;
    if (priceNum === 0 && !confirm('Price is $0. Save this item anyway?')) return;
    try {
      await api.post(`/restaurants/me/restaurant/categories/${categoryId}/items`, {
        name: name.trim(),
        description: description?.trim() || undefined,
        price: priceNum,
        imageUrl: imageUrl?.trim() || undefined,
        isAvailable: true,
        availableForPickup: availableForPickup !== false,
        availableForDelivery: availableForDelivery !== false,
      });
      setNewItem({});
      setEditingItem(null);
      load();
    } catch (e) {
      console.error(e);
    }
  }

  async function updateItem(id: string, data: Partial<MenuItem>) {
    try {
      await api.patch(`/restaurants/me/restaurant/items/${id}`, data);
      setEditingItem(null);
      setEditItemForm({ name: '', description: '', price: '', imageUrl: '' });
      load();
    } catch (e) {
      console.error(e);
    }
  }

  function saveEditItem(item: MenuItem) {
    const priceStr = editItemForm.price.trim();
    const priceNum = priceStr === '' ? null : Number(priceStr);
    if (priceNum != null && (Number.isNaN(priceNum) || priceNum < 0)) return;
    if (priceNum === 0 && !confirm('Price is $0. Save anyway?')) return;
    updateItem(item.id, {
      ...(editItemForm.name.trim() && { name: editItemForm.name.trim() }),
      ...(editItemForm.description !== undefined && { description: editItemForm.description.trim() || null }),
      ...(priceNum != null && { price: priceNum }),
      ...(editItemForm.imageUrl !== undefined && { imageUrl: editItemForm.imageUrl.trim() || null }),
    });
  }

  function startEditingItem(item: MenuItem) {
    if (editingItem === item.id) {
      setEditingItem(null);
      setEditItemForm({ name: '', description: '', price: '', imageUrl: '' });
    } else {
      setEditingItem(item.id);
      setEditItemForm({
        name: item.name ?? '',
        description: item.description ?? '',
        price: Number(item.price) != null ? String(Number(item.price)) : '',
        imageUrl: item.imageUrl ?? '',
      });
    }
  }

  async function deleteItem(id: string) {
    if (!confirm('Remove this item?')) return;
    try {
      await api.delete(`/restaurants/me/restaurant/items/${id}`);
      load();
    } catch (e) {
      console.error(e);
    }
  }

  async function moveCategoryUp(index: number) {
    const cats = restaurant!.menuCategories ?? [];
    if (index <= 0 || index >= cats.length || reordering) return;
    setReordering(true);
    const prev = cats[index - 1];
    const curr = cats[index];
    try {
      await Promise.all([
        api.patch(`/restaurants/me/restaurant/categories/${prev.id}`, { sortOrder: curr.sortOrder }),
        api.patch(`/restaurants/me/restaurant/categories/${curr.id}`, { sortOrder: prev.sortOrder }),
      ]);
      load();
    } catch (e) {
      console.error(e);
      load();
    } finally {
      setReordering(false);
    }
  }

  async function moveCategoryDown(index: number) {
    const cats = restaurant!.menuCategories ?? [];
    if (index < 0 || index >= cats.length - 1 || reordering) return;
    setReordering(true);
    const curr = cats[index];
    const next = cats[index + 1];
    try {
      await Promise.all([
        api.patch(`/restaurants/me/restaurant/categories/${curr.id}`, { sortOrder: next.sortOrder }),
        api.patch(`/restaurants/me/restaurant/categories/${next.id}`, { sortOrder: curr.sortOrder }),
      ]);
      load();
    } catch (e) {
      console.error(e);
      load();
    } finally {
      setReordering(false);
    }
  }

  async function moveItemUp(category: MenuCategory, itemIndex: number) {
    const items = category.items ?? [];
    if (itemIndex <= 0 || itemIndex >= items.length || reordering) return;
    setReordering(true);
    const prev = items[itemIndex - 1];
    const curr = items[itemIndex];
    try {
      await Promise.all([
        api.patch(`/restaurants/me/restaurant/items/${prev.id}`, { sortOrder: curr.sortOrder }),
        api.patch(`/restaurants/me/restaurant/items/${curr.id}`, { sortOrder: prev.sortOrder }),
      ]);
      load();
    } catch (e) {
      console.error(e);
      load();
    } finally {
      setReordering(false);
    }
  }

  async function moveItemDown(category: MenuCategory, itemIndex: number) {
    const items = category.items ?? [];
    if (itemIndex < 0 || itemIndex >= items.length - 1 || reordering) return;
    setReordering(true);
    const curr = items[itemIndex];
    const next = items[itemIndex + 1];
    try {
      await Promise.all([
        api.patch(`/restaurants/me/restaurant/items/${curr.id}`, { sortOrder: next.sortOrder }),
        api.patch(`/restaurants/me/restaurant/items/${next.id}`, { sortOrder: curr.sortOrder }),
      ]);
      load();
    } catch (e) {
      console.error(e);
      load();
    } finally {
      setReordering(false);
    }
  }

  async function handleImageUpload(file: File, form: 'add' | 'edit') {
    setUploadError(null);
    if (file.size > MAX_IMAGE_SIZE) {
      setUploadError('Image must be under 5MB');
      return;
    }
    if (!ACCEPT_IMAGES.split(',').includes(file.type)) {
      setUploadError('Use JPEG, PNG, WebP or GIF');
      return;
    }
    setUploadingImage(form);
    try {
      const url = await uploadMenuItemImage(file);
      if (form === 'add') {
        setNewItem((n) => ({ ...n, imageUrl: url }));
      } else {
        setEditItemForm((f) => ({ ...f, imageUrl: url }));
      }
    } catch (e: unknown) {
      const status = axios.isAxiosError(e) ? e.response?.status : 0;
      setUploadError(status === 503 ? 'Image upload is not configured' : 'Upload failed');
    } finally {
      setUploadingImage(null);
    }
  }

  if (loading) return <div className="text-text-secondary">Loading...</div>;
  if (!restaurant) {
    return (
      <div className="rounded border border-amber-200 bg-amber-50 p-4 text-amber-800">
        No restaurant profile. Create one in <a href="/profile" className="font-medium underline">Profile</a>.
      </div>
    );
  }

  const categories = restaurant.menuCategories ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-text-primary">Menu</h1>

      <div className="rounded border border-gray-200 bg-surface p-4">
        <h2 className="mb-3 font-medium">Add category</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Category name"
            className="flex-1 rounded border border-gray-300 px-3 py-2"
          />
          <button
            type="button"
            onClick={addCategory}
            className="rounded bg-primary px-4 py-2 text-white hover:bg-primary/90"
          >
            Add
          </button>
        </div>
      </div>

      {categories.map((cat, catIndex) => (
        <div key={cat.id} className="rounded border border-gray-200 bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => moveCategoryUp(catIndex)}
                  disabled={catIndex === 0 || reordering}
                  className="rounded border border-gray-300 p-0.5 text-text-secondary hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none"
                  aria-label="Move category up"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => moveCategoryDown(catIndex)}
                  disabled={catIndex === categories.length - 1 || reordering}
                  className="rounded border border-gray-300 p-0.5 text-text-secondary hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none"
                  aria-label="Move category down"
                >
                  ▼
                </button>
              </div>
              {editingCategory === cat.id ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    defaultValue={cat.name}
                    onBlur={(e) => updateCategory(cat.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') updateCategory(cat.id, (e.target as HTMLInputElement).value);
                    }}
                    autoFocus
                    className="rounded border border-gray-300 px-2 py-1"
                  />
                  <button type="button" onClick={() => setEditingCategory(null)} className="text-sm text-text-secondary">
                    Done
                  </button>
                </div>
              ) : (
                <h2 className="font-medium text-text-primary">{cat.name}</h2>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingCategory(cat.id)}
                className="text-sm text-primary hover:underline"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => deleteCategory(cat.id)}
                className="text-sm text-red-600 hover:underline"
              >
                Delete
              </button>
            </div>
          </div>

          <ul className="space-y-2">
            {(cat.items ?? []).map((item, itemIndex) => (
              <li key={item.id} className="rounded bg-background px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="flex flex-col shrink-0">
                      <button
                        type="button"
                        onClick={() => moveItemUp(cat, itemIndex)}
                        disabled={itemIndex === 0 || reordering}
                        className="rounded border border-gray-300 p-0.5 text-text-secondary hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none text-xs"
                        aria-label="Move item up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItemDown(cat, itemIndex)}
                        disabled={itemIndex === (cat.items?.length ?? 0) - 1 || reordering}
                        className="rounded border border-gray-300 p-0.5 text-text-secondary hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none text-xs"
                        aria-label="Move item down"
                      >
                        ▼
                      </button>
                    </div>
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 shrink-0 rounded bg-gray-200 flex items-center justify-center text-gray-400 text-xs" aria-hidden>
                        No img
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="font-medium">{item.name}</span>
                      {item.description && (
                        <span className="ml-2 text-sm text-text-secondary">— {item.description}</span>
                      )}
                      <span className="ml-2 text-sm font-medium text-primary">${Number(item.price).toFixed(2)}</span>
                      {!item.isAvailable && (
                        <span className="ml-2 rounded bg-gray-200 px-1.5 py-0.5 text-xs">Unavailable</span>
                      )}
                      {(item.availableForPickup === false || item.availableForDelivery === false) && (
                        <span className="ml-2 text-xs text-text-secondary">
                          {item.availableForPickup === false && item.availableForDelivery === false
                            ? '—'
                            : item.availableForPickup === false
                              ? 'Delivery only'
                              : 'Pickup only'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={item.availableForPickup !== false}
                        onChange={() => updateItem(item.id, { availableForPickup: !item.availableForPickup })}
                      />
                      Pickup
                    </label>
                    {enableDelivery && (
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={item.availableForDelivery !== false}
                          onChange={() => updateItem(item.id, { availableForDelivery: !item.availableForDelivery })}
                        />
                        Delivery
                      </label>
                    )}
                    <button
                      type="button"
                      onClick={() => startEditingItem(item)}
                      className="text-sm text-primary hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => updateItem(item.id, { isAvailable: !item.isAvailable })}
                      className="text-sm text-text-secondary hover:underline"
                    >
                      {item.isAvailable ? 'Mark unavailable' : 'Mark available'}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteItem(item.id)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {editingItem === item.id && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-gray-200 pt-2">
                    <input
                      type="text"
                      value={editItemForm.name}
                      onChange={(e) => setEditItemForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Item name"
                      className="min-w-[120px] rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                    <input
                      type="text"
                      value={editItemForm.description}
                      onChange={(e) => setEditItemForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Description"
                      className="min-w-[120px] flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={editItemForm.price}
                      onChange={(e) => setEditItemForm((f) => ({ ...f, price: formatPriceInput(e.target.value) }))}
                      placeholder="Price"
                      className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                    {editItemForm.price.trim() !== '' && Number(editItemForm.price) === 0 && (
                      <span className="text-sm text-amber-600">Price is $0</span>
                    )}
                    <input
                      type="url"
                      value={editItemForm.imageUrl}
                      onChange={(e) => setEditItemForm((f) => ({ ...f, imageUrl: e.target.value }))}
                      placeholder="Image URL"
                      className="min-w-[180px] flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                    <label className="flex items-center gap-1 text-sm shrink-0">
                      <input
                        type="file"
                        accept={ACCEPT_IMAGES}
                        className="sr-only"
                        disabled={uploadingImage !== null}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleImageUpload(f, 'edit');
                          e.target.value = '';
                        }}
                      />
                      <span className="rounded border border-gray-300 px-2 py-1 bg-gray-50 cursor-pointer hover:bg-gray-100 text-text-secondary">
                        {uploadingImage === 'edit' ? 'Uploading...' : 'Upload image'}
                      </span>
                    </label>
                    {uploadError && uploadingImage === null && (
                      <span className="text-sm text-amber-600">{uploadError}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => saveEditItem(item)}
                      className="rounded bg-primary px-3 py-1 text-sm text-white"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditingItem(null); setEditItemForm({ name: '', description: '', price: '', imageUrl: '' }); }}
                      className="text-sm text-text-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>

          {editingItem === `new-${cat.id}` ? (
            <div className="mt-3 flex flex-wrap gap-2 rounded bg-background p-3 items-center">
              <input
                type="text"
                placeholder="Item name"
                value={newItem.name ?? ''}
                onChange={(e) => setNewItem((n) => ({ ...n, name: e.target.value }))}
                className="rounded border border-gray-300 px-2 py-1"
              />
              <input
                type="text"
                placeholder="Description"
                value={newItem.description ?? ''}
                onChange={(e) => setNewItem((n) => ({ ...n, description: e.target.value }))}
                className="rounded border border-gray-300 px-2 py-1"
              />
              <input
                type="text"
                inputMode="decimal"
                placeholder="Price"
                value={newItem.price ?? ''}
                onChange={(e) => setNewItem((n) => ({ ...n, price: formatPriceInput(e.target.value) || undefined }))}
                className="w-20 rounded border border-gray-300 px-2 py-1"
              />
              {(newItem.price ?? '') !== '' && Number(newItem.price) === 0 && (
                <span className="text-sm text-amber-600">Price is $0</span>
              )}
              <input
                type="url"
                placeholder="Image URL (optional)"
                value={newItem.imageUrl ?? ''}
                onChange={(e) => setNewItem((n) => ({ ...n, imageUrl: e.target.value || undefined }))}
                className="min-w-[200px] flex-1 rounded border border-gray-300 px-2 py-1"
              />
              <label className="flex items-center gap-1 text-sm shrink-0">
                <input
                  type="file"
                  accept={ACCEPT_IMAGES}
                  className="sr-only"
                  disabled={uploadingImage !== null}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImageUpload(f, 'add');
                    e.target.value = '';
                  }}
                />
                <span className="rounded border border-gray-300 px-2 py-1 bg-gray-50 cursor-pointer hover:bg-gray-100 text-text-secondary">
                  {uploadingImage === 'add' ? 'Uploading...' : 'Upload image'}
                </span>
              </label>
              {uploadError && uploadingImage === null && (
                <span className="text-sm text-amber-600">{uploadError}</span>
              )}
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={newItem.availableForPickup !== false}
                  onChange={(e) => setNewItem((n) => ({ ...n, availableForPickup: e.target.checked }))}
                />
                Pickup
              </label>
              {enableDelivery && (
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={newItem.availableForDelivery !== false}
                    onChange={(e) => setNewItem((n) => ({ ...n, availableForDelivery: e.target.checked }))}
                  />
                  Delivery
                </label>
              )}
              <button
                type="button"
                onClick={() => addItem(cat.id)}
                className="rounded bg-primary px-3 py-1 text-sm text-white"
              >
                Add item
              </button>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-sm text-text-secondary"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingItem(`new-${cat.id}`)}
              className="mt-3 text-sm text-primary hover:underline"
            >
              + Add item
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
