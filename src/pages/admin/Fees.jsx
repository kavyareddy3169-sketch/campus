import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { Search, CreditCard, Save } from 'lucide-react';

const AdminFees = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    examAmount: 0,
    examStatus: 'unpaid',
    busAmount: 0,
    busStatus: 'unpaid',
    libraryAmount: 0,
    libraryStatus: 'unpaid'
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
      examAmount: student.examFee?.amount || 0,
      examStatus: student.examFee?.status || 'unpaid',
      busAmount: student.bus?.feeAmount || 0,
      busStatus: student.bus?.feeStatus || 'unpaid',
      libraryAmount: student.library?.feeAmount || 1200,
      libraryStatus: student.library?.subscriptionStatus === 'active' ? 'paid' : 'unpaid'
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setSaving(true);

    try {
      const updatedExamFee = { 
        amount: Number(form.examAmount), 
        status: form.examStatus 
      };
      
      const updatedBus = { 
        ...(selectedStudent.bus || { assigned: false, route: '', busNumber: '' }), 
        feeAmount: Number(form.busAmount), 
        feeStatus: form.busStatus 
      };

      const updatedLibrary = { 
        ...(selectedStudent.library || { booksBorrowed: 0, subscriptionExpiry: null }), 
        feeAmount: Number(form.libraryAmount),
        subscriptionStatus: form.libraryStatus === 'paid' ? 'active' : 'inactive' 
      };

      await updateDoc(doc(db, 'users', selectedStudent.id), {
        examFee: updatedExamFee,
        bus: updatedBus,
        library: updatedLibrary
      });

      const updatedStudent = { 
        ...selectedStudent, 
        examFee: updatedExamFee, 
        bus: updatedBus, 
        library: updatedLibrary 
      };
      
      setSelectedStudent(updatedStudent);
      setStudents(students.map(s => s.id === updatedStudent.id ? updatedStudent : s));
      alert("Fees updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to update fees");
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
          <CreditCard className="text-primary" /> Select Student
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
              <div className="text-sm text-gray-500">{student.studentId} • {student.department}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Panel: Fee Editor */}
      <div className="card md:col-span-2 h-[calc(100vh-120px)] overflow-y-auto">
        {!selectedStudent ? (
          <div className="h-full flex items-center justify-center text-gray-400">
            Select a student to manage their fees.
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="border-b pb-4 mb-6">
              <h2 className="text-xl font-bold">{selectedStudent.name}</h2>
              <p className="text-gray-500">{selectedStudent.studentId} • Fee Management</p>
            </div>

            {/* Exam Fees */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-bold text-lg mb-4 text-gray-800 border-b pb-2">Exam Fee</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Amount (₹)</label>
                  <input type="number" className="input bg-white" min="0" value={form.examAmount} onChange={e => setForm({...form, examAmount: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="input bg-white" value={form.examStatus} onChange={e => setForm({...form, examStatus: e.target.value})}>
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bus Fees */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-bold text-lg mb-4 text-gray-800 border-b pb-2 flex justify-between items-center">
                Bus Fee
                {!selectedStudent.bus?.assigned && <span className="text-xs font-normal text-warning bg-warning-bg px-2 py-1 rounded">Bus Not Assigned</span>}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Amount (₹)</label>
                  <input type="number" className="input bg-white" min="0" value={form.busAmount} onChange={e => setForm({...form, busAmount: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="input bg-white" value={form.busStatus} onChange={e => setForm({...form, busStatus: e.target.value})}>
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Library Fees */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-bold text-lg mb-4 text-gray-800 border-b pb-2">Library Subscription Fee</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Amount (₹)</label>
                  <input type="number" className="input bg-white" min="0" value={form.libraryAmount} onChange={e => setForm({...form, libraryAmount: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="input bg-white" value={form.libraryStatus} onChange={e => setForm({...form, libraryStatus: e.target.value})}>
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid (Active)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <button type="submit" className="btn btn-primary flex items-center gap-2 px-6" disabled={saving}>
                <Save size={18} /> {saving ? 'Saving...' : 'Save All Fees'}
              </button>
            </div>
          </form>
        )}
      </div>

    </div>
  );
};

export default AdminFees;
