import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Teams from './pages/Teams';
import TeamDetail from './pages/TeamDetail';
import Reports from './pages/Reports';
import ReportDetail from './pages/ReportDetail';
import ReportForm from './pages/ReportForm';
import AuditLogs from './pages/AuditLogs';
import ChangePassword from './pages/ChangePassword';
import DevRequests from './pages/DevRequests';
import DevRequestForm from './pages/DevRequestForm';
import DevRequestDetail from './pages/DevRequestDetail';
import DesignRequests from './pages/DesignRequests';
import DesignRequestForm from './pages/DesignRequestForm';
import DesignRequestDetail from './pages/DesignRequestDetail';
import SupervisorConsole from './pages/SupervisorConsole';

// wrap a page with the app layout + auth
const P = ({ children, roles }) => (
  <ProtectedRoute roles={roles}>
    <Layout>{children}</Layout>
  </ProtectedRoute>
);

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<P><Dashboard /></P>} />

      <Route path="/users" element={<P roles={['super_admin', 'admin']}><Users /></P>} />

      <Route path="/teams" element={<P roles={['super_admin', 'admin', 'team_lead']}><Teams /></P>} />
      <Route path="/teams/:id" element={<P roles={['super_admin', 'admin', 'team_lead']}><TeamDetail /></P>} />

      <Route path="/reports" element={<P><Reports /></P>} />
      <Route path="/reports/new" element={<P roles={['employee']}><ReportForm /></P>} />
      <Route path="/reports/:id/edit" element={<P roles={['employee']}><ReportForm /></P>} />
      <Route path="/reports/:id" element={<P><ReportDetail /></P>} />

      <Route path="/dev-requests" element={<P><DevRequests /></P>} />
      <Route path="/dev-requests/new" element={<P roles={['employee']}><DevRequestForm /></P>} />
      <Route path="/dev-requests/:id" element={<P><DevRequestDetail /></P>} />

      <Route path="/design-requests" element={<P><DesignRequests /></P>} />
      <Route path="/design-requests/new" element={<P roles={['employee']}><DesignRequestForm /></P>} />
      <Route path="/design-requests/:id" element={<P><DesignRequestDetail /></P>} />

      <Route path="/supervisor" element={<P roles={['supervisor', 'admin', 'super_admin']}><SupervisorConsole /></P>} />

      <Route path="/audit" element={<P roles={['super_admin']}><AuditLogs /></P>} />
      <Route path="/change-password" element={<P><ChangePassword /></P>} />

      <Route path="*" element={<div className="p-10 text-center text-slate-500">404 - Page not found</div>} />
    </Routes>
  );
}
