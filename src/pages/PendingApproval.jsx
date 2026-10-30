import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { Clock, LogOut, CheckCircle, XCircle } from 'lucide-react';

const PendingApproval = () => {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  // If status changes (real-time), redirect accordingly
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (userData) {
      const status = userData.status;
      if (status === 'approved') {
        navigate('/student');
      } else if (status === 'rejected') {
        navigate('/rejected');
      } else if (status === 'removed') {
        navigate('/login');
      }
      // if 'pending' or missing — stay here
    }
  }, [userData, currentUser, navigate]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div className="auth-container animate-fade-in" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div className="auth-card" style={{ maxWidth: '500px', textAlign: 'center' }}>
        <div className="auth-header">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(234, 179, 8, 0.1)', borderRadius: '50%', padding: '1.5rem', display: 'inline-flex' }}>
              <Clock size={48} style={{ color: '#ca8a04' }} />
            </div>
          </div>
          <h2 className="auth-title">Awaiting Admin Approval</h2>
          <p className="auth-subtitle">Your registration has been submitted successfully.</p>
        </div>

        <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: '0.75rem', padding: '1.25rem', margin: '1.5rem 0', textAlign: 'left' }}>
          <p style={{ color: '#713f12', fontWeight: 600, marginBottom: '0.5rem' }}>📋 What happens next?</p>
          <ul style={{ color: '#92400e', fontSize: '0.875rem', lineHeight: 1.8, paddingLeft: '1.25rem' }}>
            <li>An administrator will review your registration details.</li>
            <li>Once approved, you will gain full access to the Student Portal.</li>
            <li>This page will automatically redirect you upon approval.</li>
            <li>If rejected, you will be notified with a reason.</li>
          </ul>
        </div>

        {userData && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem', textAlign: 'left' }}>
            <p style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 600, marginBottom: '0.5rem' }}>REGISTERED AS</p>
            <p style={{ fontWeight: 700, color: '#15803d' }}>{userData.name}</p>
            <p style={{ fontSize: '0.875rem', color: '#16a34a' }}>{userData.email} • {userData.department} Yr {userData.year}</p>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          <div className="loader" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
          <span>Checking approval status automatically...</span>
        </div>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="btn btn-outline"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          <LogOut size={18} />
          {loggingOut ? 'Signing out...' : 'Sign Out'}
        </button>
      </div>
    </div>
  );
};

export default PendingApproval;
