import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { Search, Library, Save } from 'lucide-react';

const AdminLibrary = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    subscriptionStatus: 'inactive',
    subscriptionExpiry: '',
    booksBorrowed: 0
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

  const filteredStudents = students.filter(s => 
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.studentId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setForm({
      subscriptionStatus: student.library?.subscriptionStatus || 'inactive',
      subscriptionExpiry: student.library?.subscriptionExpiry || '',
      booksBorrowed: student.library?.booksBorrowed || 0
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setSaving(true);

    try {
      const updatedLibrary = { 
        ...selectedStudent.library,
        subscriptionStatus: form.subscriptionStatus,
        subscriptionExpiry: form.subscriptionExpiry || null,
        booksBorrowed: Number(form.booksBorrowed)
      };

      await updateDoc(doc(db, 'users', selectedStudent.id), { library: updatedLibrary });

      const updatedStudent = { ...selectedStudent, library: updatedLibrary };
      setSelectedStudent(updatedStudent);
      setStudents(students.map(s => s.id === updatedStudent.id ? updatedStudent : s));
      alert("Library status updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to update library status");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loader mx-auto mt-10"></div>;

  return (
    <div className="max-w-6xl mx-auto animate-fade-in grid md:grid-cols-3 gap-6">
      
      {/* Sidebar: Student List */}
      <div className="card md:col-span-1 h-[calc(100vh-120px)] flex flex-col">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Library className="text-primary" /> Select Student
        </h3>
        <div className="relative mb-4">
          <input 
            type="text" 
            placeholder="Search student..." 
            className="input pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
        </div>
        <div className="flex-1 overflow-y-auto pr-2 space-y-2">
          {filteredStudents.map(student => (
            <div 
              key={student.id} 
              onClick={() => handleSelectStudent(student)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedStudent?.id === student.id ? 'bg-primary-light border-primary' : 'bg-gray-50 border-gray-200 hover:border-primary'}`}
            >
              <div className="font-bold text-gray-900">{student.name}</div>
              <div className="text-sm flex justify-between">
                <span className="text-gray-500">{student.studentId}</span>
                <span className={`font-semibold ${student.library?.subscriptionStatus === 'active' ? 'text-success' : 'text-gray-400'}`}>
                  {student.library?.subscriptionStatus === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="md:col-span-2 space-y-6 overflow-y-auto h-[calc(100vh-120px)] pr-2">
        <div className="card">
          {!selectedStudent ? (
            <div className="py-10 flex flex-col items-center justify-center text-gray-400 text-center">
              <Library size={48} className="mb-4 text-gray-300" />
              <p>Select a student to manage their library access.</p>
            </div>
          ) : (
            <form onSubmit={handleSave}>
              <div className="border-b pb-4 mb-6">
                <h2 className="text-xl font-bold">{selectedStudent.name}</h2>
                <p className="text-gray-500">{selectedStudent.studentId} • Digital Library Access</p>
              </div>

              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="form-group">
                    <label className="form-label">Subscription Status</label>
                    <select className="input bg-white" value={form.subscriptionStatus} onChange={e => setForm({...form, subscriptionStatus: e.target.value})}>
                      <option value="inactive">Inactive</option>
                      <option value="active">Active</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Subscription Expiry Date</label>
                    <input 
                      type="date" 
                      className="input bg-white" 
                      value={form.subscriptionExpiry} 
                      onChange={e => setForm({...form, subscriptionExpiry: e.target.value})} 
                      required={form.subscriptionStatus === 'active'}
                    />
                  </div>
                </div>

                <div className="form-group max-w-xs">
                  <label className="form-label">Books Currently Borrowed</label>
                  <input 
                    type="number" 
                    className="input bg-white text-lg font-bold" 
                    min="0" 
                    value={form.booksBorrowed} 
                    onChange={e => setForm({...form, booksBorrowed: e.target.value})} 
                    required 
                  />
                  <p className="text-xs text-gray-500 mt-2">Adjust this manually when books are physically issued or returned at the desk.</p>
                </div>
              </div>

              <div className="flex justify-end pt-6 mt-8 border-t">
                <button type="submit" className="btn btn-primary flex items-center gap-2 px-6" disabled={saving}>
                  <Save size={18} /> {saving ? 'Saving...' : 'Save Library Data'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLibrary;
