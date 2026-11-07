import { useEffect, useState, useCallback } from 'react';
import http from '../../api/http';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { useToast } from '../../context/useToast';
import { PlatformThroughputChart } from '../../components/analytics/PlatformThroughputChart';
import {
  Plus,
  Copy,
  RefreshCw,
  Search,
} from 'lucide-react';

export const AdminDashboard = ({ activeTab = 'overview' }) => {
  const [users, setUsers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'interviewer' });
  const [createdInviteUrl, setCreatedInviteUrl] = useState(null);
  const toast = useToast();

  const loadData = useCallback(async () => {
    try {
      if (activeTab === 'overview') {
        const [usersRes, invitesRes, auditRes, analyticsRes] = await Promise.allSettled([
          http.get('/admin/users?limit=50'),
          http.get('/admin/invitations?limit=50'),
          http.get('/admin/audit-logs?limit=50'),
          http.get('/analytics/admin'),
        ]);
        if (usersRes.status === 'fulfilled') setUsers(usersRes.value.data.users || []);
        if (invitesRes.status === 'fulfilled') setInvitations(invitesRes.value.data.invitations || []);
        if (auditRes.status === 'fulfilled') setAuditLogs(auditRes.value.data.auditLogs || []);
        if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data.analytics || null);
      } else {
        if (activeTab === 'users') {
          const res = await http.get('/admin/users?limit=50');
          setUsers(res.data.users || []);
        }
        if (activeTab === 'invitations') {
          const res = await http.get('/admin/invitations?limit=50');
          setInvitations(res.data.invitations || []);
        }
        if (activeTab === 'audit-logs') {
          const res = await http.get('/admin/audit-logs?limit=50');
          setAuditLogs(res.data.auditLogs || []);
        }
        if (activeTab === 'settings') {
          const res = await http.get('/admin/settings');
          setSettings(res.data.settings || {});
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch admin data');
    } finally {
      setLoading(false);
    }
  }, [activeTab, toast]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (active) {
        await loadData();
      }
    })();
    return () => {
      active = false;
    };
  }, [loadData]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await http.patch(`/admin/users/${userId}/role`, { role: newRole });
      toast.success('User role updated');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role');
    }
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    try {
      await http.patch(`/admin/users/${userId}/status`, { isActive: !currentStatus });
      toast.success(`User ${currentStatus ? 'deactivated' : 'activated'}`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleRevokeSessions = async (userId) => {
    try {
      await http.post(`/admin/users/${userId}/revoke-sessions`);
      toast.success('User sessions revoked');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to revoke sessions');
    }
  };

  const handleCreateInvite = async (e) => {
    e.preventDefault();
    try {
      const res = await http.post('/admin/invitations', inviteForm);
      toast.success('Invitation generated');
      setCreatedInviteUrl(res.data.inviteUrl);
      setInviteForm({ email: '', role: 'interviewer' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create invitation');
    }
  };

  const handleRevokeInvite = async (inviteId) => {
    try {
      await http.delete(`/admin/invitations/${inviteId}`);
      toast.success('Invitation revoked');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to revoke invitation');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Link copied to clipboard');
  };

  const filteredUsers = users.filter((u) => {
    if (!userSearch) return true;
    const term = userSearch.toLowerCase();
    return u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <p className="text-xs text-slate-500 font-medium">Total Registered Users</p>
              <p className="text-2xl font-bold mt-1">{users.length}</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <p className="text-xs text-indigo-500 font-medium">Interviewers</p>
              <p className="text-2xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">
                {users.filter((u) => u.role === 'interviewer').length}
              </p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <p className="text-xs text-purple-500 font-medium">Pending Invitations</p>
              <p className="text-2xl font-bold mt-1 text-purple-600 dark:text-purple-400">
                {invitations.filter((i) => !i.usedAt && !i.revokedAt).length}
              </p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <p className="text-xs text-slate-500 font-medium">Audit Events Logged</p>
              <p className="text-2xl font-bold mt-1">{auditLogs.length}</p>
            </div>
          </div>

          <PlatformThroughputChart analytics={analytics} />

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <h3 className="font-semibold text-sm mb-3">Recent Security & Administrative Actions</h3>
            {loading ? (
              <SkeletonLoader count={3} />
            ) : auditLogs.length === 0 ? (
              <p className="text-xs text-slate-400">No audit events recorded yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {auditLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{log.action}</span>
                      <span className="text-slate-400 ml-2">on {log.targetType} #{log.targetId}</span>
                    </div>
                    <span className="text-slate-400">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Users Directory Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <Button size="sm" variant="outline" onClick={loadData}>
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-3 px-4 font-semibold">User</th>
                  <th className="py-3 px-4 font-semibold">Role</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Joined</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850 transition">
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{u.name}</p>
                      <p className="text-[11px] text-slate-400">{u.email}</p>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-transparent font-medium"
                      >
                        <option value="candidate">Candidate</option>
                        <option value="interviewer">Interviewer</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={u.isActive ? 'active' : 'inactive'}>
                        {u.isActive ? 'Active' : 'Deactivated'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleStatusToggle(u.id, u.isActive)}
                        className={u.isActive ? 'text-amber-600' : 'text-emerald-600'}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRevokeSessions(u.id)}
                        className="text-slate-500"
                      >
                        Revoke Sessions
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invitations Tab */}
      {activeTab === 'invitations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Interviewer & Admin Invitations</h2>
            <Button size="sm" onClick={() => { setCreatedInviteUrl(null); setInviteModalOpen(true); }}>
              <Plus className="w-3.5 h-3.5" />
              Generate Invitation Link
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-3 px-4 font-semibold">Invited Email</th>
                  <th className="py-3 px-4 font-semibold">Role</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Expires</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invitations.map((inv) => {
                  const isUsed = !!inv.usedAt;
                  const isRevoked = !!inv.revokedAt;
                  const isExpired = new Date(inv.expiresAt) < new Date();
                  const status = isUsed ? 'Redeemed' : isRevoked ? 'Revoked' : isExpired ? 'Expired' : 'Active';

                  return (
                    <tr key={inv.id}>
                      <td className="py-3 px-4 font-medium">{inv.email}</td>
                      <td className="py-3 px-4"><Badge variant={inv.role}>{inv.role}</Badge></td>
                      <td className="py-3 px-4"><Badge variant={isUsed ? 'completed' : isRevoked ? 'cancelled' : 'scheduled'}>{status}</Badge></td>
                      <td className="py-3 px-4 text-slate-400">{new Date(inv.expiresAt).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">
                        {!isUsed && !isRevoked && !isExpired && (
                          <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => handleRevokeInvite(inv.id)}>
                            Revoke
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === 'audit-logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Immutable Security Audit Trail</h2>
            <Button size="sm" variant="outline" onClick={loadData}>
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Logs
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <tr>
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold">Action</th>
                  <th className="py-3 px-4 font-semibold">Actor</th>
                  <th className="py-3 px-4 font-semibold">Target</th>
                  <th className="py-3 px-4 font-semibold">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="font-mono text-[11px]">
                    <td className="py-2.5 px-4 text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">{log.action}</td>
                    <td className="py-2.5 px-4">{log.actor ? `${log.actor.name} (${log.actor.email})` : 'System'}</td>
                    <td className="py-2.5 px-4 text-slate-500">{log.targetType} #{log.targetId || '-'}</td>
                    <td className="py-2.5 px-4 text-slate-400">{log.ipAddress || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Platform Settings Tab */}
      {activeTab === 'settings' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <h2 className="text-sm font-semibold">Platform Global Configuration</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cached key-value parameters dynamically controlling platform limits and features.
          </p>

          <div className="space-y-3 pt-2">
            {Object.entries(settings).length === 0 ? (
              <p className="text-xs text-slate-400">No dynamic settings configured.</p>
            ) : (
              Object.entries(settings).map(([k, v]) => (
                <div
                  key={k}
                  className="p-4 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-semibold">{k}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{JSON.stringify(v)}</p>
                  </div>
                  <Badge variant="interviewer">Active</Badge>
                </div>
              ))
            )}
            <div className="p-4 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold">Default Session Buffer Limit</p>
                <p className="text-[11px] text-slate-400">Maximum allowed characters in Monaco real-time editor</p>
              </div>
              <Badge variant="interviewer">50,000 characters</Badge>
            </div>
          </div>
        </div>
      )}

      {/* Invitation Generation Modal */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Generate Single-Use Invitation"
      >
        {createdInviteUrl ? (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-900 dark:text-emerald-100 text-xs">
              Invitation link generated successfully! Share this link securely with the recipient.
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-slate-500">Invitation Link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdInviteUrl}
                  className="w-full text-xs font-mono p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800"
                />
                <Button size="sm" onClick={() => copyToClipboard(createdInviteUrl)}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <div className="flex justify-end pt-3">
              <Button size="sm" onClick={() => setInviteModalOpen(false)}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateInvite} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Recipient Email</label>
              <input
                type="email"
                required
                placeholder="colleague@example.com"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Target Role</label>
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="interviewer">Interviewer</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button variant="ghost" onClick={() => setInviteModalOpen(false)}>Cancel</Button>
              <Button type="submit">Generate Link</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
