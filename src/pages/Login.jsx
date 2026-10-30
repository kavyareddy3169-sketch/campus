import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Login = () => {
  const [tab, setTab] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loadingState, setLoadingState] = useState(false);
  
  const navigate = useNavigate();
  const { currentUser, userData, loading } = useAuth();

  // Handle auto-redirect if already logged in (prevents getting stuck on login page)
  useEffect(() => {
    // Only auto-redirect if we're not currently submitting a form
    if (currentUser && !loading && userData && !loadingState) {
      navigate(`/${userData.role || 'student'}`, { replace: true });
    }
  }, [currentUser, loading, userData, navigate, loadingState]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoadingState(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
          const dbUserData = userDoc.data();
          
          if (tab === 'admin') {
            if (dbUserData.role === 'admin') {
              navigate('/admin');
            } else {
              await signOut(auth);
              setError('You do not have administrator access.');
            }
          } else {
            // Student Login
            navigate(`/${dbUserData.role || 'student'}`);
          }
        } else {
          // Document missing
          if (tab === 'admin') {
            await signOut(auth);
            setError('Admin profile not found in database. Contact system administrator.');
          } else {
            // Forward to complete profile page
            navigate('/complete-profile');
          }
        }
      } catch (firestoreError) {
        console.error('Firestore error during login:', firestoreError);
        await signOut(auth);
        
        if (firestoreError.message?.includes('offline') || firestoreError.code === 'unavailable') {
          setError('Could not connect to database. Please check your network or ensure Firestore is enabled.');
        } else {
          setError('Database permission error. Please contact the administrator.');
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'Failed to login. Please check your credentials.');
    } finally {
      setLoadingState(false);
    }
  };

  return (
    <div className="auth-container animate-fade-in">
      <div className="auth-card">
        
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button 
            className={`flex-1 py-3 text-center font-semibold transition-colors ${tab === 'student' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => { setTab('student'); setError(''); }}
          >
            Student Login
          </button>
          <button 
            className={`flex-1 py-3 text-center font-semibold transition-colors ${tab === 'admin' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => { setTab('admin'); setError(''); }}
          >
            Admin Login
          </button>
        </div>

        <div className="auth-header">
          <h2 className="auth-title">Welcome Back</h2>
          <p className="auth-subtitle">
            {tab === 'student' ? 'Login to your Student Portal' : 'Login to the Admin Dashboard'}
          </p>
        </div>
        
        {error && <div className="form-error">{error}</div>}
        
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input 
              type="email" 
              className="input" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              placeholder="Enter your email"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="input" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              placeholder="Enter your password"
            />
          </div>
          
          <button type="submit" className="btn btn-primary auth-button" disabled={loadingState}>
            {loadingState ? 'Logging in...' : <><LogIn size={18} /> {tab === 'admin' ? 'Admin Login' : 'Login'}</>}
          </button>
        </form>
        
        {tab === 'student' && (
          <div className="auth-footer mt-4">
            Don't have an account? <Link to="/register">Register here</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
