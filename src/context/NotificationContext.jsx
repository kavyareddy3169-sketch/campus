import { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Since we need to combine 'all' and specific 'studentId', we'll set up two listeners
    // to bypass Firestore limitations on OR queries in older SDKs
    
    const personalQ = query(collection(db, 'notifications'), where('studentId', '==', currentUser.uid));
    const globalQ = query(collection(db, 'notifications'), where('studentId', '==', 'all'));

    let personalNotifs = [];
    let globalNotifs = [];

    const calculateTotals = () => {
      const combined = [...personalNotifs, ...globalNotifs];
      combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setNotifications(combined);
      setUnreadCount(combined.filter(n => !n.read).length);
    };

    const unsubPersonal = onSnapshot(personalQ, (snapshot) => {
      personalNotifs = [];
      snapshot.forEach(doc => personalNotifs.push({ id: doc.id, ...doc.data() }));
      calculateTotals();
    });

    const unsubGlobal = onSnapshot(globalQ, (snapshot) => {
      globalNotifs = [];
      snapshot.forEach(doc => globalNotifs.push({ id: doc.id, ...doc.data() }));
      calculateTotals();
    });

    return () => {
      unsubPersonal();
      unsubGlobal();
    };
  }, [currentUser]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};
