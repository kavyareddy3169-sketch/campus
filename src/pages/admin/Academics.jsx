import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { Search, GraduationCap, Plus, Edit, Trash2, Save, X } from 'lucide-react';

const AdminAcademics = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Subject Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubjectIndex, setEditingSubjectIndex] = useState(null);
  const [subjectForm, setSubjectForm] = useState({
    subjectName: '',
    subjectCode: '',
    attendedClasses: 0,
    totalClasses: 0,
    internalMarks: 0
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

  const openAddSubject = () => {
    setSubjectForm({ subjectName: '', subjectCode: '', attendedClasses: 0, totalClasses: 0, internalMarks: 0 });
    setEditingSubjectIndex(null);
    setIsModalOpen(true);
  };

  const openEditSubject = (index, subject) => {
    setSubjectForm({ ...subject });
    setEditingSubjectIndex(index);
    setIsModalOpen(true);
  };

  const calculateOverallAttendance = (subjects) => {
    if (!subjects || subjects.length === 0) return 0;
    let totalAttended = 0;
    let totalHeld = 0;
    subjects.forEach(s => {
      totalAttended += Number(s.attendedClasses || 0);
      totalHeld += Number(s.totalClasses || 0);
    });
    return totalHeld === 0 ? 0 : Math.round((totalAttended / totalHeld) * 100);
  };

  const saveSubject = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;

    let updatedSubjects = [...(selectedStudent.subjects || [])];
    
    // Auto-calculate subject percentage
    const attended = Number(subjectForm.attendedClasses);
    const total = Number(subjectForm.totalClasses);
    const percentage = total === 0 ? 0 : Math.round((attended / total) * 100);
    
    const newSubject = { ...subjectForm, attendedClasses: attended, totalClasses: total, attendancePercentage: percentage, internalMarks: Number(subjectForm.internalMarks) };

    if (editingSubjectIndex !== null) {
      updatedSubjects[editingSubjectIndex] = newSubject;
    } else {
      updatedSubjects.push(newSubject);
    }

    const overallAttendance = calculateOverallAttendance(updatedSubjects);

    try {
      await updateDoc(doc(db, 'users', selectedStudent.id), {
        subjects: updatedSubjects,
        attendancePercentage: overallAttendance
      });

      const updatedStudent = { ...selectedStudent, subjects: updatedSubjects, attendancePercentage: overallAttendance };
      setSelectedStudent(updatedStudent);
      setStudents(students.map(s => s.id === updatedStudent.id ? updatedStudent : s));
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save subject");
    }
  };

  const deleteSubject = async (index) => {
    if (!window.confirm("Delete this subject?")) return;
    
    let updatedSubjects = [...(selectedStudent.subjects || [])];
    updatedSubjects.splice(index, 1);
    
    const overallAttendance = calculateOverallAttendance(updatedSubjects);

    try {
      await updateDoc(doc(db, 'users', selectedStudent.id), {
        subjects: updatedSubjects,
        attendancePercentage: overallAttendance
      });
      const updatedStudent = { ...selectedStudent, subjects: updatedSubjects, attendancePercentage: overallAttendance };
      setSelectedStudent(updatedStudent);
      setStudents(students.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    } catch (err) {
      console.error(err);
      alert("Failed to delete subject");
    }
  };

  if (loading) return <div className="loader mx-auto mt-10"></div>;

  return (
    <div className="max-w-6xl mx-auto animate-fade-in grid md:grid-cols-3 gap-6">
      
      {/* Sidebar: Student List */}
      <div className="card md:col-span-1 h-[calc(100vh-120px)] flex flex-col">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <GraduationCap className="text-primary" /> Select Student
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
              onClick={() => setSelectedStudent(student)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedStudent?.id === student.id ? 'bg-primary-light border-primary' : 'bg-gray-50 border-gray-200 hover:border-primary'}`}
            >
              <div className="font-bold text-gray-900">{student.name}</div>
              <div className="text-sm text-gray-500">{student.studentId} • {student.department}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Panel: Academics Editor */}
      <div className="card md:col-span-2 h-[calc(100vh-120px)] flex flex-col">
        {!selectedStudent ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Select a student from the list to manage their academics.
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-start border-b pb-4 mb-4">
              <div>
                <h2 className="text-xl font-bold">{selectedStudent.name}</h2>
                <p className="text-gray-500">{selectedStudent.studentId} • {selectedStudent.department} Yr {selectedStudent.year}</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Overall Attendance</div>
                <div className={`text-2xl font-bold ${selectedStudent.attendancePercentage >= 75 ? 'text-success' : 'text-danger'}`}>
                  {selectedStudent.attendancePercentage || 0}%
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Subjects</h3>
              <button onClick={openAddSubject} className="btn btn-primary py-1.5 text-sm flex items-center gap-1">
                <Plus size={16} /> Add Subject
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {(!selectedStudent.subjects || selectedStudent.subjects.length === 0) ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded border border-dashed">
                  No subjects added yet.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="p-3 border-b font-semibold text-gray-600">Subject</th>
                      <th className="p-3 border-b font-semibold text-gray-600">Attendance</th>
                      <th className="p-3 border-b font-semibold text-gray-600">Internal</th>
                      <th className="p-3 border-b font-semibold text-gray-600 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedStudent.subjects.map((sub, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="font-medium text-gray-900">{sub.subjectName}</div>
                          <div className="text-xs text-gray-500">{sub.subjectCode}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium">{sub.attendedClasses} / {sub.totalClasses}</div>
                          <div className={`text-xs ${sub.attendancePercentage >= 75 ? 'text-success' : 'text-danger'}`}>{sub.attendancePercentage}%</div>
                        </td>
                        <td className="p-3 font-medium">
                          {sub.internalMarks} <span className="text-gray-400 text-xs">/ 30</span>
                        </td>
                        <td className="p-3 text-right">
                          <button onClick={() => openEditSubject(idx, sub)} className="text-primary hover:text-primary-dark p-1">
                            <Edit size={16} />
                          </button>
                          <button onClick={() => deleteSubject(idx)} className="text-danger hover:text-red-700 p-1 ml-2">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Subject Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-5 border-b">
              <h3 className="text-lg font-bold">{editingSubjectIndex !== null ? 'Edit Subject' : 'Add Subject'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500"><X size={20} /></button>
            </div>
            <form onSubmit={saveSubject} className="p-5">
              <div className="space-y-4">
                <div className="form-group">
                  <label className="form-label">Subject Name</label>
                  <input type="text" className="input" value={subjectForm.subjectName} onChange={e => setSubjectForm({...subjectForm, subjectName: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Subject Code</label>
                  <input type="text" className="input" value={subjectForm.subjectCode} onChange={e => setSubjectForm({...subjectForm, subjectCode: e.target.value})} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Attended Classes</label>
                    <input type="number" className="input" min="0" value={subjectForm.attendedClasses} onChange={e => setSubjectForm({...subjectForm, attendedClasses: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Classes</label>
                    <input type="number" className="input" min="0" value={subjectForm.totalClasses} onChange={e => setSubjectForm({...subjectForm, totalClasses: e.target.value})} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Internal Marks (Out of 30)</label>
                  <input type="number" className="input" min="0" max="30" value={subjectForm.internalMarks} onChange={e => setSubjectForm({...subjectForm, internalMarks: e.target.value})} required />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3 border-t pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary flex items-center gap-1"><Save size={16} /> Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAcademics;
