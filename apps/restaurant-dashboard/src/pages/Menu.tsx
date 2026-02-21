import { useEffect, useState } from 'react';
import { api, type Restaurant, type MenuItem } from '../api';

export default function Menu() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newItem, setNewItem] = useState<Partial<MenuItem> & { categoryId?: string }>({});

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
    const { name, description, price } = newItem;
    if (!name?.trim() || price == null || price < 0) return;
    try {
      await api.post(`/restaurants/me/restaurant/categories/${categoryId}/items`, {
        name: name.trim(),
        description: description?.trim() || undefined,
        price: Number(price),
        isAvailable: true,
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
      load();
    } catch (e) {
      console.error(e);
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

      {categories.map((cat) => (
        <div key={cat.id} className="rounded border border-gray-200 bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
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
            {(cat.items ?? []).map((item) => (
              <li key={item.id} className="flex items-center justify-between rounded bg-background px-3 py-2">
                <div>
                  <span className="font-medium">{item.name}</span>
                  {item.description && (
                    <span className="ml-2 text-sm text-text-secondary">— {item.description}</span>
                  )}
                  <span className="ml-2 text-sm font-medium text-primary">${Number(item.price).toFixed(2)}</span>
                  {!item.isAvailable && (
                    <span className="ml-2 rounded bg-gray-200 px-1.5 py-0.5 text-xs">Unavailable</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingItem(editingItem === item.id ? null : item.id)}
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
              </li>
            ))}
          </ul>

          {editingItem === `new-${cat.id}` ? (
            <div className="mt-3 flex flex-wrap gap-2 rounded bg-background p-3">
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
                type="number"
                step="0.01"
                min="0"
                placeholder="Price"
                value={newItem.price ?? ''}
                onChange={(e) => setNewItem((n) => ({ ...n, price: e.target.value ? Number(e.target.value) : undefined }))}
                className="w-20 rounded border border-gray-300 px-2 py-1"
              />
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
