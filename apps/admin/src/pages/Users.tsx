import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  restaurant?: { id: string; name: string } | null;
};

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = roleFilter ? { role: roleFilter } : {};
    api
      .get<User[]>('/admin/users', { params })
      .then((r) => setUsers(r.data))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [roleFilter]);

  if (loading && users.length === 0) return <div className="text-text-secondary">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-text-primary">Users</h1>
      <div>
        <label className="mr-2 text-sm text-text-secondary">Filter by role:</label>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        >
          <option value="">All</option>
          <option value="CUSTOMER">Customer</option>
          <option value="RESTAURANT_OWNER">Restaurant owner</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>
      <div className="overflow-x-auto rounded border border-gray-200 bg-surface">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-text-primary">Name</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-text-primary">Email</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-text-primary">Role</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-text-primary">Restaurant</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-text-primary">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2 text-sm">{u.name}</td>
                <td className="px-4 py-2 text-sm">{u.email}</td>
                <td className="px-4 py-2">
                  <span className="text-sm">{u.role}</span>
                  {u.role === 'RESTAURANT_OWNER' && (
                    <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                      Owner
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-sm">
                  {u.role === 'RESTAURANT_OWNER' ? (
                    u.restaurant ? (
                      <Link
                        to={`/restaurants?detail=${u.restaurant.id}`}
                        className="text-primary underline hover:no-underline"
                      >
                        {u.restaurant.name}
                      </Link>
                    ) : (
                      <span className="text-text-secondary">No restaurant yet</span>
                    )
                  ) : (
                    <span className="text-text-secondary">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-sm text-text-secondary">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
