import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { 
  GraduationCap, 
  CreditCard, 
  Bus, 
  Library, 
  BookOpen, 
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

const Dashboard = () => {
  const { userData } = useAuth();
  const { unreadCount } = useNotifications();

  if (!userData) return <div className="loader mx-auto mt-10"></div>;

  const attendanceStr = userData.attendancePercentage || 0;
  
  // Safely fallback structure to prevent crashes if a legacy user hasn't synced
  const examFee = userData.examFee || { amount: 0, status: 'unpaid' };
  const bus = userData.bus || { assigned: false, route: '', feeStatus: 'unpaid' };
  const library = userData.library || { subscriptionStatus: 'inactive', booksBorrowed: 0 };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {userData.name}!</h1>
          <p className="text-gray-600">Here is your campus overview for today.</p>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 text-center">
          <div className="text-sm text-gray-500 font-medium">Semester</div>
          <div className="text-xl font-bold text-primary">Year {userData.year} (Sec {userData.section})</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Attendance Card */}
        <div className="card">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm text-gray-500 font-medium">Overall Attendance</p>
              <h3 className="text-2xl font-bold mt-1">
                {attendanceStr}%
              </h3>
            </div>
            <div className="p-2 bg-primary-light rounded-lg">
              <GraduationCap className="text-primary" size={24} />
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${attendanceStr >= 75 ? 'bg-success' : 'bg-danger'}`} 
              style={{ width: `${Math.min(attendanceStr, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {attendanceStr >= 75 ? 'You are eligible for exams.' : 'Warning: Low attendance!'}
          </p>
        </div>

        {/* Exam Fee Card */}
        <div className="card">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm text-gray-500 font-medium">Exam Fee</p>
              <h3 className="text-2xl font-bold mt-1">₹{examFee.amount}</h3>
            </div>
            <div className="p-2 bg-warning-bg rounded-lg">
              <CreditCard className="text-warning" size={24} />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            {examFee.status === 'paid' ? (
              <span className="badge badge-success"><CheckCircle size={14} className="mr-1"/> Paid</span>
            ) : (
              <span className="badge badge-danger"><XCircle size={14} className="mr-1"/> Unpaid</span>
            )}
          </div>
        </div>

        {/* Bus Tracking Card */}
        <div className="card">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm text-gray-500 font-medium">Bus Transport</p>
              <h3 className="text-lg font-bold mt-1 text-gray-900 truncate">
                {bus.assigned ? bus.route || 'Assigned' : 'Not Assigned'}
              </h3>
            </div>
            <div className="p-2 bg-primary-light rounded-lg">
              <Bus className="text-primary" size={24} />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            {bus.feeStatus === 'paid' ? (
              <span className="badge badge-success"><CheckCircle size={14} className="mr-1"/> Fee Paid</span>
            ) : (
              <span className="badge badge-danger"><XCircle size={14} className="mr-1"/> Unpaid</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {bus.feeStatus === 'paid' ? 'Live tracking enabled.' : 'Pay fee to unlock live tracking.'}
          </p>
        </div>

        {/* Library Subs Card */}
        <div className="card">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm text-gray-500 font-medium">Library Sub</p>
              <h3 className="text-lg font-bold mt-1 text-gray-900 truncate">
                {library.subscriptionStatus === 'active' ? 'Active' : 'Expired/Unpaid'}
              </h3>
              {library.subscriptionStatus === 'active' && library.subscriptionExpiry && (
                <p className="text-xs text-gray-500 mt-1">Valid till: {new Date(library.subscriptionExpiry).toLocaleDateString()}</p>
              )}
            </div>
            <div className="p-2 bg-secondary rounded-lg bg-opacity-10" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
              <Library className="text-secondary" size={24} />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
             {library.subscriptionStatus === 'active' ? (
              <span className="badge badge-success"><CheckCircle size={14} className="mr-1"/> Borrowing Enabled</span>
            ) : (
              <span className="badge badge-danger"><XCircle size={14} className="mr-1"/> Borrowing Locked</span>
            )}
          </div>
        </div>

        {/* Borrowed Books Card */}
        <div className="card">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm text-gray-500 font-medium">Books Borrowed</p>
              <h3 className="text-2xl font-bold mt-1">{library.booksBorrowed || 0}</h3>
            </div>
            <div className="p-2 bg-gray-100 rounded-lg">
              <BookOpen className="text-gray-600" size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-primary font-medium cursor-pointer hover:underline">
            View borrowed books &rarr;
          </div>
        </div>

        {/* Notifications Card */}
        <div className="card">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm text-gray-500 font-medium">Notifications</p>
              <h3 className="text-2xl font-bold mt-1">{unreadCount} Unread</h3>
            </div>
            <div className="p-2 bg-danger-bg rounded-lg">
              <Clock className="text-danger" size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-primary font-medium cursor-pointer hover:underline">
            View all notifications &rarr;
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
