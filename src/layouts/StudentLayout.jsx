import DashboardLayout from './DashboardLayout';
import { 
  LayoutDashboard, 
  GraduationCap, 
  Bus, 
  Library, 
  CreditCard, 
  Bell 
} from 'lucide-react';

const studentNavItems = [
  { path: '/student', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/student/academics', label: 'Academics', icon: GraduationCap },
  { path: '/student/bus', label: 'Smart Bus', icon: Bus },
  { path: '/student/library', label: 'Library', icon: Library },
  { path: '/student/fees', label: 'Fees & Payments', icon: CreditCard },
  { path: '/student/notifications', label: 'Notifications', icon: Bell },
];

const StudentLayout = () => {
  return <DashboardLayout navItems={studentNavItems} />;
};

export default StudentLayout;
