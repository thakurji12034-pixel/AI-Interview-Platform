import { useState } from 'react';
import { useAuth } from '../context/useAuth';
import { AppShell } from '../components/layout/AppShell';
import { CandidateDashboard } from '../features/dashboard/CandidateDashboard';
import { InterviewerDashboard } from '../features/dashboard/InterviewerDashboard';
import { AdminDashboard } from '../features/admin/AdminDashboard';

export default function Dashboard() {
  const { user } = useAuth();
  const [adminTab, setAdminTab] = useState('overview');

  return (
    <AppShell activeTab={adminTab} onTabChange={setAdminTab}>
      {user?.role === 'admin' ? (
        <AdminDashboard activeTab={adminTab} />
      ) : user?.role === 'interviewer' ? (
        <InterviewerDashboard />
      ) : (
        <CandidateDashboard />
      )}
    </AppShell>
  );
}
