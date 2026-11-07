import { useState } from 'react';
import { useAuth } from '../context/useAuth';
import { AppShell } from '../components/layout/AppShell';
import { CandidateDashboard } from '../features/dashboard/CandidateDashboard';
import { InterviewerDashboard } from '../features/dashboard/InterviewerDashboard';
import { AdminDashboard } from '../features/admin/AdminDashboard';
import { QuestionManager } from '../features/questions/QuestionManager';
import ReportsPage from './ReportsPage';

export default function Dashboard() {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState(() => (user?.role === 'admin' ? 'overview' : 'interviews'));

  const renderContent = () => {
    if (currentTab === 'questions') {
      return <QuestionManager />;
    }

    if (currentTab === 'reports') {
      return <ReportsPage />;
    }

    if (user?.role === 'admin') {
      return <AdminDashboard activeTab={currentTab} />;
    }

    if (user?.role === 'interviewer') {
      return <InterviewerDashboard />;
    }

    return <CandidateDashboard />;
  };

  // If reports tab is active, ReportsPage provides its own AppShell wrapper, so render directly or handle cleanly
  if (currentTab === 'reports') {
    return <ReportsPage />;
  }

  return (
    <AppShell activeTab={currentTab} onTabChange={setCurrentTab}>
      {renderContent()}
    </AppShell>
  );
}
