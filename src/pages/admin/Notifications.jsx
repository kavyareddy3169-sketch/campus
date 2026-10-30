import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { Bell, Send } from 'lucide-react';

const AdminNotifications = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [form, setForm] = useState({
    recipient: 'all', // 'all' or studentId
    title: '',
    message: ''
  });

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'student'));
        const snap = await getDocs(q);
        const list = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        setStudents(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.title || !form.message) return;
    setSending(true);

    try {
      await addDoc(collection(db, 'notifications'), {
        studentId: form.recipient,
        title: form.title,
        message: form.message,
        createdAt: new Date().toISOString(),
        read: false
      });

      alert("Notification sent successfully!");
      setForm({ ...form, title: '', message: '' }); // Reset message fields
    } catch (err) {
      console.error(err);
      alert("Failed to send notification.");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="loader mx-auto mt-10"></div>;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="card">
        <div className="border-b pb-4 mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="text-primary" /> Send Notification
          </h2>
          <p className="text-gray-500 mt-1">Push alerts to specific students or broadcast to the entire campus.</p>
        </div>

        <form onSubmit={handleSend} className="space-y-6">
          <div className="form-group">
            <label className="form-label">Recipient</label>
            <select 
              className="input bg-white" 
              value={form.recipient} 
              onChange={e => setForm({...form, recipient: e.target.value})}
              required
            >
              <option value="all" className="font-bold">Broadcast to All Students</option>
              <optgroup label="Specific Students">
                {students.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.name} ({student.studentId})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Notification Title</label>
            <input 
              type="text" 
              className="input bg-white" 
              placeholder="e.g. Exam Schedule Released" 
              value={form.title} 
              onChange={e => setForm({...form, title: e.target.value})}
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Message Content</label>
            <textarea 
              className="input bg-white min-h-[150px] resize-y" 
              placeholder="Type your message here..." 
              value={form.message} 
              onChange={e => setForm({...form, message: e.target.value})}
              required 
            ></textarea>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <button type="submit" className="btn btn-primary flex items-center gap-2 px-8" disabled={sending}>
              <Send size={18} /> {sending ? 'Sending...' : 'Push Notification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminNotifications;
