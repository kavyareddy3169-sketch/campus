import { db } from '../firebase/config';
import { doc, setDoc, collection } from 'firebase/firestore';

export const injectDemoData = async () => {
  // 1. Create a dummy admin user if needed (Assuming logged in admin is already there)
  
  // 2. Demo Buses
  const buses = [
    { id: 'BUS-01', busNumber: 'AP 09 CB 1234', route: 'Campus - City Center', stops: ['Campus', 'Crossroads', 'City Center'], driverName: 'Ramesh' },
    { id: 'BUS-02', busNumber: 'AP 09 CB 5678', route: 'Campus - North Station', stops: ['Campus', 'North Station'], driverName: 'Suresh' },
    { id: 'BUS-03', busNumber: 'AP 09 CB 9012', route: 'Campus - South Gate', stops: ['Campus', 'South Gate'], driverName: 'Mahesh' }
  ];

  for (const bus of buses) {
    await setDoc(doc(db, 'buses', bus.id), bus);
  }

  // 3. Demo Books
  const books = [
    { id: 'BK-01', title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', category: 'Computer Science', description: 'Comprehensive guide to algorithms.', totalCopies: 5, availableCopies: 5 },
    { id: 'BK-02', title: 'Clean Code', author: 'Robert C. Martin', category: 'Software Engineering', description: 'A Handbook of Agile Software Craftsmanship.', totalCopies: 3, availableCopies: 3 },
    { id: 'BK-03', title: 'Engineering Physics', author: 'R.K. Gaur', category: 'Physics', description: 'Basic concepts of physics for engineers.', totalCopies: 10, availableCopies: 10 },
    { id: 'BK-04', title: 'Calculus Early Transcendentals', author: 'James Stewart', category: 'Mathematics', description: 'Calculus textbook.', totalCopies: 7, availableCopies: 7 },
  ];

  for (const book of books) {
    await setDoc(doc(db, 'books', book.id), book);
  }

  // 4. Global Announcements
  const announcements = [
    { id: 'ANN-01', title: 'Mid Semester Exams Scheduled', content: 'Exams will start from next Monday.', date: new Date().toISOString() },
    { id: 'ANN-02', title: 'Library Renovation', content: 'Library will be closed this weekend.', date: new Date().toISOString() }
  ];

  for (const ann of announcements) {
    await setDoc(doc(db, 'announcements', ann.id), ann);
  }

  alert("Demo Data Injected Successfully!");
};
