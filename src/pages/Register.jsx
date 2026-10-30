import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import { UserPlus } from 'lucide-react';
import './Auth.css';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    studentId: '',
    email: '',
    mobile: '',
    department: '',
    year: '1',
    section: 'A',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // Initialize the unified student record in users collection
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: formData.fullName,
        studentId: formData.studentId,
        email: formData.email,
        mobile: formData.mobile,
        department: formData.department,
        year: formData.year,
        section: formData.section,
        role: 'student',
        status: 'pending',
        createdAt: new Date().toISOString(),
        registeredAt: new Date().toISOString(),
        
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

      navigate('/pending');
    } catch (err) {
      setError(err.message || 'Failed to create an account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container animate-fade-in" style={{ padding: '2rem 1rem' }}>
      <div className="auth-card" style={{ maxWidth: '600px' }}>
        <div className="auth-header">
          <h2 className="auth-title">Create Account</h2>
          <p className="auth-subtitle">Register as a Student</p>
        </div>
        
        {error && <div className="form-error">{error}</div>}
        
        <form onSubmit={handleRegister}>
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
              <label className="form-label">Email</label>
              <input type="email" name="email" className="input" value={formData.email} onChange={handleChange} required />
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
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" name="password" className="input" value={formData.password} onChange={handleChange} required minLength={6} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input type="password" name="confirmPassword" className="input" value={formData.confirmPassword} onChange={handleChange} required />
            </div>
          </div>
          
          <button type="submit" className="btn btn-primary auth-button mt-4" disabled={loading}>
            {loading ? 'Creating Account...' : <><UserPlus size={18} /> Register</>}
          </button>
        </form>
        
        <div className="auth-footer">
          Already have an account? <Link to="/login">Login here</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
