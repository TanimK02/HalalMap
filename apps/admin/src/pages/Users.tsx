import { useEffect, useState } from 'react';
import { api } from '../api';

type User = { id: string; name: string; email: string; role: string; createdAt: string };

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<User[]>('/admin/users')
      .then((r) => setUsers(r.data))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-text-secondary">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-text-primary">Users</h1>
      <div className="overflow-x-auto rounded border border-gray-200 bg-surface">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-text-primary">Name</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-text-primary">Email</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-text-primary">Role</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-text-primary">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2 text-sm">{u.name}</td>
                <td className="px-4 py-2 text-sm">{u.email}</td>
                <td className="px-4 py-2 text-sm">{u.role}</td>
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
