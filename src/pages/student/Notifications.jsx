import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, orderBy, updateDoc, doc } from 'firebase/firestore';
import { Bell, CheckCircle, Clock } from 'lucide-react';

const StudentNotifications = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!currentUser) return;
      try {
        // Fetch personal notifications
        const personalQ = query(
          collection(db, 'notifications'), 
          where('studentId', '==', currentUser.uid)
        );
        const personalSnap = await getDocs(personalQ);
        
        // Fetch global notifications
        const globalQ = query(
          collection(db, 'notifications'), 
          where('studentId', '==', 'all')
        );
        const globalSnap = await getDocs(globalQ);

        const list = [];
        personalSnap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        globalSnap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));

        // Sort by date descending
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        setNotifications(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, [currentUser]);

  const markAsRead = async (id, currentReadStatus) => {
    if (currentReadStatus) return;
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
      setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error("Failed to mark read", err);
    }
  };

  if (loading) return <div className="loader mx-auto mt-10"></div>;

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="text-primary" /> Notifications
        </h2>
      </div>

      <div className="space-y-4">
        {notifications.length > 0 ? notifications.map((notif) => (
          <div 
            key={notif.id} 
            className={`card flex items-start gap-4 transition-all ${notif.read ? 'opacity-70' : 'border-l-4 border-l-primary shadow-md'}`}
            onClick={() => markAsRead(notif.id, notif.read)}
          >
            <div className={`p-3 rounded-full flex-shrink-0 ${notif.read ? 'bg-gray-100 text-gray-400' : 'bg-primary-light text-primary'}`}>
              <Bell size={24} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-1">
                <h3 className={`text-lg ${notif.read ? 'font-medium text-gray-700' : 'font-bold text-gray-900'}`}>
                  {notif.title}
                </h3>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock size={12} /> {new Date(notif.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className={`text-sm ${notif.read ? 'text-gray-500' : 'text-gray-700'}`}>
                {notif.message}
              </p>
              {!notif.read && (
                <div className="mt-3 flex items-center text-xs font-semibold text-primary gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span> New
                </div>
              )}
            </div>
            {notif.read && (
              <div className="flex-shrink-0 text-success">
                <CheckCircle size={20} />
              </div>
            )}
          </div>
        )) : (
          <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow-sm border border-gray-100">
            <Bell size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No Notifications Yet</p>
            <p className="text-sm mt-1">You're all caught up!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentNotifications;
