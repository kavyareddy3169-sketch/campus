import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Users, Bus, BookOpen, CreditCard, Clock, CheckCircle, XCircle, UserX } from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    pendingStudents: 0,
    approvedStudents: 0,
    rejectedStudents: 0,
    removedStudents: 0,
    activeBuses: 0,
    totalBooks: 0,
    issuedBooks: 0,
    feeCollected: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const usersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
        
        let totalFee = 0;
        let issuedBooks = 0;
        let activeBuses = 0;
        let pending = 0, approved = 0, rejected = 0, removed = 0;
        
        usersSnap.forEach(doc => {
          const data = doc.data();
          
          // Status counting — treat missing status as 'approved' (backwards compatibility)
          const status = data.status || 'approved';
          if (status === 'pending') pending++;
          else if (status === 'rejected') rejected++;
          else if (status === 'removed') removed++;
          else approved++; // 'approved' or missing

          if (data.examFee?.status === 'paid') totalFee += Number(data.examFee.amount || 0);
          if (data.bus?.feeStatus === 'paid') totalFee += Number(data.bus.feeAmount || 0);
          if (data.library?.subscriptionStatus === 'active') totalFee += 1200;

          if (data.bus?.assigned) activeBuses++;
          issuedBooks += Number(data.library?.booksBorrowed || 0);
        });

        setStats({
          totalStudents: usersSnap.size,
          pendingStudents: pending,
          approvedStudents: approved,
          rejectedStudents: rejected,
          removedStudents: removed,
          activeBuses,
          totalBooks: 5000,
          issuedBooks,
          feeCollected: totalFee
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="loader mx-auto mt-10"></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Admin Overview</h2>
      </div>
      
      {/* Student Status Cards */}
      <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Student Registration Status</p>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card" style={{ borderLeft: '4px solid #6b7280' }}>
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Students</p>
              <h3 className="text-3xl font-bold mt-1">{stats.totalStudents}</h3>
            </div>
            <div className="p-2 bg-gray-100 rounded-lg">
              <Users className="text-gray-500" size={22} />
            </div>
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #ca8a04' }}>
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm text-gray-500 font-medium">Pending Approval</p>
              <h3 className="text-3xl font-bold mt-1 text-yellow-600">{stats.pendingStudents}</h3>
            </div>
            <div className="p-2 rounded-lg" style={{ background: 'rgba(234,179,8,0.1)' }}>
              <Clock className="text-yellow-600" size={22} />
            </div>
          </div>
          {stats.pendingStudents > 0 && (
            <p className="text-xs text-yellow-600 font-medium mt-1">⚠ Requires action</p>
          )}
        </div>

        <div className="card" style={{ borderLeft: '4px solid #16a34a' }}>
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm text-gray-500 font-medium">Approved</p>
              <h3 className="text-3xl font-bold mt-1 text-green-600">{stats.approvedStudents}</h3>
            </div>
            <div className="p-2 rounded-lg" style={{ background: 'rgba(22,163,74,0.1)' }}>
              <CheckCircle className="text-green-600" size={22} />
            </div>
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #dc2626' }}>
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm text-gray-500 font-medium">Rejected / Removed</p>
              <h3 className="text-3xl font-bold mt-1 text-red-600">{stats.rejectedStudents + stats.removedStudents}</h3>
            </div>
            <div className="p-2 rounded-lg" style={{ background: 'rgba(220,38,38,0.1)' }}>
              <XCircle className="text-red-600" size={22} />
            </div>
          </div>
          <p className="text-xs text-gray-400">{stats.rejectedStudents} rejected · {stats.removedStudents} removed</p>
        </div>
      </div>

      {/* Institution Stats */}
      <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Institution Overview</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
              <h3 className="text-3xl font-bold mt-1 text-success">₹{stats.feeCollected}</h3>
            </div>
            <div className="p-3 bg-success-bg rounded-lg">
              <CreditCard className="text-success" size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm text-gray-500 font-medium">Active Buses</p>
              <h3 className="text-3xl font-bold mt-1">{stats.activeBuses}</h3>
            </div>
            <div className="p-3 bg-warning-bg rounded-lg">
              <Bus className="text-warning" size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Library Books</p>
              <h3 className="text-3xl font-bold mt-1">{stats.totalBooks}</h3>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
              <BookOpen className="text-secondary" size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm text-gray-500 font-medium">Books Currently Issued</p>
              <h3 className="text-3xl font-bold mt-1">{stats.issuedBooks}</h3>
            </div>
            <div className="p-3 bg-danger-bg rounded-lg">
              <Clock className="text-danger" size={24} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
