import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import { UserCheck } from 'lucide-react';
import './Auth.css';

const CompleteProfile = () => {
  const navigate = useNavigate();
  const { currentUser, userData, loading: authLoading } = useAuth();
  
  const [formData, setFormData] = useState({
    fullName: '',
    studentId: '',
    mobile: '',
    department: '',
    year: '1',
    section: 'A'
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      navigate('/login');
    }
    if (!authLoading && currentUser && userData) {
      // Profile already exists
      navigate('/student');
    }
  }, [currentUser, userData, authLoading, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Create unified user document
      await setDoc(doc(db, 'users', currentUser.uid), {
        uid: currentUser.uid,
        name: formData.fullName,
        studentId: formData.studentId,
        email: currentUser.email,
        mobile: formData.mobile,
        department: formData.department,
        year: formData.year,
        section: formData.section,
        role: 'student',
        createdAt: new Date().toISOString(),
        
        // Unified Modules
        attendancePercentage: 0,
        subjects: [],
        examFee: { amount: 1500, status: 'unpaid' },
        bus: { 
          assigned: false, 
          busNumber: '',
          routeName: '',
          pickupLocation: '',
          stops: [],
          destinationName: '',
          feeAmount: 5000, 
          feeStatus: 'unpaid' 
        },
        library: { subscriptionStatus: 'inactive', subscriptionExpiry: null, booksBorrowed: 0 },
        notifications: []
      });

      // Reload window to sync AuthContext state
      window.location.href = '/student';
      
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to complete profile.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <div className="loader mx-auto mt-20"></div>;

  return (
    <div className="auth-container animate-fade-in" style={{ padding: '2rem 1rem' }}>
      <div className="auth-card" style={{ maxWidth: '600px' }}>
        <div className="auth-header">
          <h2 className="auth-title">Complete Profile</h2>
          <p className="auth-subtitle">Please provide your student details to continue.</p>
        </div>
        
        {error && <div className="form-error">{error}</div>}
        
        <form onSubmit={handleComplete}>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input type="text" name="fullName" className="input" value={formData.fullName} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Student ID / Roll No.</label>
              <input type="text" name="studentId" className="input" value={formData.studentId} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Mobile Number</label>
              <input type="tel" name="mobile" className="input" value={formData.mobile} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Department</label>
              <select name="department" className="input" value={formData.department} onChange={handleChange} required>
                <option value="">Select Department</option>
                <option value="CSE">Computer Science</option>
                <option value="ECE">Electronics</option>
                <option value="MECH">Mechanical</option>
                <option value="CIVIL">Civil</option>
                <option value="IT">Information Technology</option>
                <option value="AIML">AI & Machine Learning</option>
                <option value="DS">Data Science</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="form-group">
                <label className="form-label">Year</label>
                <select name="year" className="input" value={formData.year} onChange={handleChange} required>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Section</label>
                <select name="section" className="input" value={formData.section} onChange={handleChange} required>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  <option value="E">E</option>
                  <option value="F">F</option>
                </select>
              </div>
            </div>
          </div>
          
          <button type="submit" className="btn btn-primary auth-button mt-4" disabled={loading}>
            {loading ? 'Saving...' : <><UserCheck size={18} /> Complete Setup</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfile;
