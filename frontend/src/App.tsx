import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ReportView from './pages/ReportView';
import ManageUsers from './pages/Admin/ManageUsers';
import ManageReports from './pages/Admin/ManageReports';
import ManagePermissions from './pages/Admin/ManagePermissions';
import PowerBISettings from './pages/Admin/PowerBISettings';

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return null;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/report/:id" element={<ProtectedRoute><AppLayout><ReportView /></AppLayout></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute adminOnly><AppLayout><ManageUsers /></AppLayout></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute adminOnly><AppLayout><ManageReports /></AppLayout></ProtectedRoute>} />
      <Route path="/admin/permissions" element={<ProtectedRoute adminOnly><AppLayout><ManagePermissions /></AppLayout></ProtectedRoute>} />
      <Route path="/admin/powerbi" element={<ProtectedRoute adminOnly><AppLayout><PowerBISettings /></AppLayout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
