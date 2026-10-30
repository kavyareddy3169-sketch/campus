import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { XCircle, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Rejected = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div className="auth-container animate-fade-in" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div className="auth-card" style={{ maxWidth: '480px', textAlign: 'center' }}>
        <div className="auth-header">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', padding: '1.5rem', display: 'inline-flex' }}>
              <XCircle size={48} style={{ color: '#dc2626' }} />
            </div>
          </div>
          <h2 className="auth-title" style={{ color: '#dc2626' }}>Registration Rejected</h2>
          <p className="auth-subtitle">Your registration request has been rejected by the administrator.</p>
        </div>

        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '0.75rem', padding: '1.25rem', margin: '1.5rem 0', textAlign: 'left' }}>
          <p style={{ color: '#7f1d1d', fontSize: '0.875rem' }}>
            Your account registration was not approved. If you believe this is a mistake, please contact your institution's administration office with your registration details.
          </p>
        </div>

        {userData && (
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem', textAlign: 'left' }}>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600, marginBottom: '0.25rem' }}>REJECTED ACCOUNT</p>
            <p style={{ fontWeight: 600, color: '#374151' }}>{userData.name}</p>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{userData.email}</p>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="btn btn-outline"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Rejected;
