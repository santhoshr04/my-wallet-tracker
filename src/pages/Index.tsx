import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import PageLoader from '@/components/PageLoader';
import DashboardPage from './DashboardPage';

export default function Index() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  return (
    <AppLayout>
      <DashboardPage />
    </AppLayout>
  );
}
