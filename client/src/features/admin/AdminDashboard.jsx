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
  Shield,
  Users,
  FileText,
  Activity,
  CheckCircle2,
  UserCheck,
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

  const interviewerCount = users.filter((u) => u.role === 'interviewer').length;
  const candidateCount = users.filter((u) => u.role === 'candidate').length;
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const pendingInvitesCount = invitations.filter((i) => !i.usedAt && !i.revokedAt).length;

  return (
    <div className="space-y-6">
      {/* Admin Command Center Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-purple-950/20 to-slate-900/90 p-6 sm:p-7 shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Shield className="w-3.5 h-3.5" />
                <span>Super Administrator</span>
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-xs text-slate-400">Platform Governance & Audit</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Admin Command Center</h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Inspect system throughput, manage user permissions, issue staff invitations, and verify immutable audit trail logs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              size="sm"
              variant="outline"
              onClick={loadData}
              className="text-xs border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1 text-slate-400" />
              Refresh
            </Button>

            <Button
              size="sm"
              onClick={() => { setCreatedInviteUrl(null); setInviteModalOpen(true); }}
              className="bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-500 text-white text-xs shadow-md shadow-purple-600/20"
            >
              <Plus className="w-4 h-4 mr-1" />
              Generate Invitation
            </Button>
          </div>
        </div>
      </div>

      {/* Overview Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 4 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1 */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 transition-all hover:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Platform Users</span>
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">{users.length}</span>
                <span className="text-[11px] text-slate-500">accounts</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/60">
                  {interviewerCount} interviewers
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-950/60 text-teal-300 border border-teal-800/60">
                  {candidateCount} candidates
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/60">
                  {adminCount} admins
                </span>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 transition-all hover:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-indigo-400">Interviewer Staff</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">{interviewerCount}</span>
                <span className="text-[11px] text-indigo-400 font-medium">active evaluators</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Authorized technical staff</p>
            </div>

            {/* Metric 3 */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 transition-all hover:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-amber-400">Pending Invitations</span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">{pendingInvitesCount}</span>
                <span className="text-[11px] text-amber-400 font-medium">unredeemed</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Role-specific invite tokens</p>
            </div>

            {/* Metric 4 */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 transition-all hover:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-400">Audit Trail Events</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">{auditLogs.length}</span>
                <span className="text-[11px] text-emerald-400 font-medium">immutable logs</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Cryptographically tracked</p>
            </div>
          </div>

          {/* Platform Throughput Chart */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-5">
            <PlatformThroughputChart analytics={analytics} />
          </div>

          {/* Recent Security & Administrative Activity */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm text-white">Recent Security & Governance Events</h3>
              <span className="text-[11px] text-slate-500">Live feed</span>
            </div>
            {loading ? (
              <SkeletonLoader count={3} />
            ) : auditLogs.length === 0 ? (
              <p className="text-xs text-slate-400">No audit events recorded yet.</p>
            ) : (
              <div className="divide-y divide-slate-800">
                {auditLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-purple-400" />
                      <div>
                        <span className="font-semibold text-white">{log.action}</span>
                        <span className="text-slate-400 ml-2">on {log.targetType} #{log.targetId}</span>
                      </div>
                    </div>
                    <span className="text-slate-500 font-mono text-[11px]">
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
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search user by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/80 pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
              />
            </div>
            <Button size="sm" variant="outline" onClick={loadData} className="text-xs border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200">
              <RefreshCw className="w-3.5 h-3.5 mr-1 text-slate-400" />
              Refresh Directory
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-900/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">User Identity</th>
                  <th className="py-3 px-4 font-semibold">Assigned Role</th>
                  <th className="py-3 px-4 font-semibold">Account Status</th>
                  <th className="py-3 px-4 font-semibold">Registration Date</th>
                  <th className="py-3 px-4 font-semibold text-right">Administrative Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-white">{u.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{u.email}</p>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 font-medium focus:outline-none focus:border-indigo-500"
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
                        className={`text-xs ${u.isActive ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-950/30' : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30'}`}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRevokeSessions(u.id)}
                        className="text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-950/30"
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
            <div>
              <h2 className="text-base font-bold text-white">Staff Invitations</h2>
              <p className="text-xs text-slate-400">Single-use cryptographically signed onboarding links.</p>
            </div>
            <Button
              size="sm"
              onClick={() => { setCreatedInviteUrl(null); setInviteModalOpen(true); }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Generate Invitation Link
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-900/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Invited Email</th>
                  <th className="py-3 px-4 font-semibold">Target Role</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Expires At</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {invitations.map((inv) => {
                  const isUsed = !!inv.usedAt;
                  const isRevoked = !!inv.revokedAt;
                  const isExpired = new Date(inv.expiresAt) < new Date();
                  const status = isUsed ? 'Redeemed' : isRevoked ? 'Revoked' : isExpired ? 'Expired' : 'Active';

                  return (
                    <tr key={inv.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-medium text-white font-mono">{inv.email}</td>
                      <td className="py-3 px-4"><Badge variant={inv.role}>{inv.role}</Badge></td>
                      <td className="py-3 px-4"><Badge variant={isUsed ? 'completed' : isRevoked ? 'cancelled' : 'scheduled'}>{status}</Badge></td>
                      <td className="py-3 px-4 text-slate-400">{new Date(inv.expiresAt).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">
                        {!isUsed && !isRevoked && !isExpired && (
                          <Button size="sm" variant="ghost" className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30" onClick={() => handleRevokeInvite(inv.id)}>
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
            <div>
              <h2 className="text-base font-bold text-white">Immutable Security Audit Trail</h2>
              <p className="text-xs text-slate-400">Append-only compliance log for all administrative and auth actions.</p>
            </div>
            <Button size="sm" variant="outline" onClick={loadData} className="text-xs border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200">
              <RefreshCw className="w-3.5 h-3.5 mr-1 text-slate-400" />
              Refresh Logs
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-900/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold">Action</th>
                  <th className="py-3 px-4 font-semibold">Actor</th>
                  <th className="py-3 px-4 font-semibold">Target</th>
                  <th className="py-3 px-4 font-semibold">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="font-mono text-[11px] hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-4 text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="py-2.5 px-4 font-semibold text-purple-300">{log.action}</td>
                    <td className="py-2.5 px-4 text-slate-300">{log.actor ? `${log.actor.name} (${log.actor.email})` : 'System'}</td>
                    <td className="py-2.5 px-4 text-slate-400">{log.targetType} #{log.targetId || '-'}</td>
                    <td className="py-2.5 px-4 text-slate-500">{log.ipAddress || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Platform Settings Tab */}
      {activeTab === 'settings' && (
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-white">Platform Global Configuration</h2>
            <p className="text-xs text-slate-400 mt-1">
              Cached parameters dynamically controlling platform limits, session bounds, and mock fallbacks.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {Object.entries(settings).length === 0 ? (
              <p className="text-xs text-slate-400">No dynamic settings configured.</p>
            ) : (
              Object.entries(settings).map(([k, v]) => (
                <div
                  key={k}
                  className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-semibold text-white">{k}</p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">{JSON.stringify(v)}</p>
                  </div>
                  <Badge variant="interviewer">Active</Badge>
                </div>
              ))
            )}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white">Default Session Buffer Limit</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Maximum allowed characters in Monaco real-time editor</p>
              </div>
              <Badge variant="interviewer">50,000 characters</Badge>
            </div>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white">JWT Access Expiry</p>
                <p className="text-[11px] text-slate-400 mt-0.5">HS256 access token lifetime before refresh rotation</p>
              </div>
              <Badge variant="scheduled">15 minutes</Badge>
            </div>
          </div>
        </div>
      )}

      {/* Invitation Generation Modal */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Generate Single-Use Staff Invitation"
      >
        {createdInviteUrl ? (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-950/40 border border-emerald-800 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Invitation link generated successfully! Share this link securely with the recipient.</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Single-Use Invite URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdInviteUrl}
                  className="w-full text-xs font-mono p-2.5 border border-slate-800 rounded-xl bg-slate-950 text-slate-200"
                />
                <Button size="sm" onClick={() => copyToClipboard(createdInviteUrl)} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex justify-end pt-3">
              <Button size="sm" onClick={() => setInviteModalOpen(false)} className="bg-slate-800 hover:bg-slate-700 text-white text-xs">
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateInvite} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Recipient Email Address</label>
              <input
                type="email"
                required
                placeholder="colleague@example.com"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Target Staff Role</label>
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
              >
                <option value="interviewer">Interviewer</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
              <Button variant="ghost" onClick={() => setInviteModalOpen(false)} className="text-xs text-slate-400 hover:text-slate-200">
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4">
                Generate Link
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
