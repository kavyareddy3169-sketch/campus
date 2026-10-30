import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Bus, BookOpen, Monitor } from 'lucide-react';
import './SplashScreen.css';

const SplashScreen = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/login');
    }, 2500); // 2.5 seconds

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="splash-screen">
      <div className="splash-content animate-slide-up">
        <div className="logo-container">
          <div className="icon-grid">
            <GraduationCap className="icon primary" size={40} />
            <Monitor className="icon secondary" size={40} />
            <BookOpen className="icon secondary" size={40} />
            <Bus className="icon primary" size={40} />
          </div>
        </div>
        <h1 className="app-title">CampusSphere</h1>
        <p className="app-subtitle">Smart Campus Management System</p>
        <div className="loader"></div>
      </div>
    </div>
  );
};

export default SplashScreen;
