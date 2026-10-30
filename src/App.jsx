import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import SplashScreen from './components/SplashScreen';
import Login from './pages/Login';
import Register from './pages/Register';
import CompleteProfile from './pages/CompleteProfile';
import PendingApproval from './pages/PendingApproval';
import Rejected from './pages/Rejected';

import StudentLayout from './layouts/StudentLayout';
import AdminLayout from './layouts/AdminLayout';

import StudentDashboard from './pages/student/Dashboard';
import StudentAcademics from './pages/student/Academics';
import StudentBus from './pages/student/Bus';
import StudentLibrary from './pages/student/Library';
import StudentFees from './pages/student/Fees';
import StudentNotifications from './pages/student/Notifications';

import AdminDashboard from './pages/admin/Dashboard';
import AdminStudents from './pages/admin/Students';
import AdminAcademics from './pages/admin/Academics';
import AdminBus from './pages/admin/Bus';
import AdminLibrary from './pages/admin/Library';
import AdminFees from './pages/admin/Fees';
import AdminNotifications from './pages/admin/Notifications';

const ProtectedRoute = ({ children, allowedRole }) => {
  const { currentUser, userData, loading } = useAuth();

  if (loading) return <div className="splash-screen"><div className="loader"></div></div>;
  if (!currentUser) return <Navigate to="/login" />;

  // Status-based access control (only applies to students)
  if (allowedRole === 'student' && userData) {
    const status = userData.status;
    // Treat missing status as 'approved' for backwards compatibility with existing students
    if (status === 'pending') return <Navigate to="/pending" />;
    if (status === 'rejected') return <Navigate to="/rejected" />;
    if (status === 'removed') return <Navigate to="/login" />;
  }

  if (userData && userData.role !== allowedRole) {
    return <Navigate to={`/${userData.role}`} />;
  }

  return children;
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<SplashScreen />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/complete-profile" element={<CompleteProfile />} />
      <Route path="/pending" element={<PendingApproval />} />
      <Route path="/rejected" element={<Rejected />} />
      
      {/* Student Routes */}
      <Route path="/student" element={
        <ProtectedRoute allowedRole="student">
          <StudentLayout />
        </ProtectedRoute>
      }>
        <Route index element={<StudentDashboard />} />
        <Route path="academics" element={<StudentAcademics />} />
        <Route path="bus" element={<StudentBus />} />
        <Route path="library" element={<StudentLibrary />} />
        <Route path="fees" element={<StudentFees />} />
        <Route path="notifications" element={<StudentNotifications />} />
      </Route>
      
      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRole="admin">
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="academics" element={<AdminAcademics />} />
        <Route path="bus" element={<AdminBus />} />
        <Route path="library" element={<AdminLibrary />} />
        <Route path="fees" element={<AdminFees />} />
        <Route path="notifications" element={<AdminNotifications />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
