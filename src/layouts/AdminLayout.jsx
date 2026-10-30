import DashboardLayout from './DashboardLayout';
import { 
  LayoutDashboard, 
  Users,
  GraduationCap, 
  Bus, 
  Library, 
  CreditCard,
  Bell
} from 'lucide-react';

const adminNavItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/students', label: 'Students', icon: Users },
  { path: '/admin/academics', label: 'Academics', icon: GraduationCap },
  { path: '/admin/bus', label: 'Bus & Tracking', icon: Bus },
  { path: '/admin/library', label: 'Library', icon: Library },
  { path: '/admin/fees', label: 'Fees Collection', icon: CreditCard },
  { path: '/admin/notifications', label: 'Notifications', icon: Bell },
];

const AdminLayout = () => {
  return <DashboardLayout navItems={adminNavItems} />;
};

export default AdminLayout;
