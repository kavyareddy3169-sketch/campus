import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { Search, Edit, Users, X, Save, GraduationCap, Plus, Trash2, Clock, CheckCircle, XCircle, UserX, RotateCcw, Eye } from 'lucide-react';

const TABS = ['Approved', 'Pending Approvals', 'Manage Students', 'Rejected Applications'];

const AdminStudents = () => {
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Approved');

  // Profile Edit State
  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Attendance Edit State
  const [attendanceStudent, setAttendanceStudent] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [attendanceSaving, setAttendanceSaving] = useState(false);

  // View Student Modal
  const [viewingStudent, setViewingStudent] = useState(null);

  const fetchStudents = async () => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'student'));
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setAllStudents(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStudents(); }, []);

  const getStatus = (s) => s.status || 'approved';

  const pendingStudents = allStudents.filter(s => getStatus(s) === 'pending');
  const approvedStudents = allStudents.filter(s => getStatus(s) === 'approved');
  const managedStudents = allStudents.filter(s => ['approved', 'removed'].includes(getStatus(s)));

  const filterStudents = (list) => list.filter(s =>
    s.name?.toLowerCase().includes(searchQuery) ||
    s.studentId?.toLowerCase().includes(searchQuery) ||
    s.email?.toLowerCase().includes(searchQuery)
  );

  // Status actions
  const updateStatus = async (studentId, newStatus, label) => {
    if (!window.confirm(`Are you sure you want to ${label} this student?`)) return;
    try {
      await updateDoc(doc(db, 'users', studentId), { status: newStatus, [`${newStatus}At`]: new Date().toISOString() });
      setAllStudents(prev => prev.map(s => s.id === studentId ? { ...s, status: newStatus } : s));
      alert(`Student ${label}d successfully.`);
    } catch (err) {
      console.error(err);
      alert(`Failed to ${label} student.`);
    }
  };

  // Profile Edit
  const openEditModal = (student) => {
    setEditingStudent(student);
    setEditForm({ name: student.name, studentId: student.studentId, mobile: student.mobile, department: student.department, year: student.year, section: student.section });
  };
  const closeEditModal = () => { setEditingStudent(null); setEditForm({}); };
  const handleEditChange = (e) => setEditForm({ ...editForm, [e.target.name]: e.target.value });
  const saveChanges = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', editingStudent.id), editForm);
      setAllStudents(prev => prev.map(s => s.id === editingStudent.id ? { ...s, ...editForm } : s));
      closeEditModal();
      alert("Student profile updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to update student.");
    } finally { setSaving(false); }
  };

  // Attendance Edit
  const openAttendanceModal = (student) => {
    setAttendanceStudent(student);
    setSubjects(student.subjects ? JSON.parse(JSON.stringify(student.subjects)) : []);
  };
  const closeAttendanceModal = () => { setAttendanceStudent(null); setSubjects([]); };
  const handleSubjectChange = (index, field, value) => {
    const newSubjects = [...subjects];
    newSubjects[index][field] = value;
    if (field === 'attendedClasses' || field === 'totalClasses') {
      const attended = Number(newSubjects[index].attendedClasses || 0);
      const total = Number(newSubjects[index].totalClasses || 0);
      newSubjects[index].attendancePercentage = total === 0 ? 0 : Math.round((attended / total) * 100);
    }
    setSubjects(newSubjects);
  };
  const addSubject = () => setSubjects([...subjects, { subjectName: '', subjectCode: '', attendedClasses: 0, totalClasses: 0, attendancePercentage: 0, internalMarks: 0 }]);
  const removeSubject = (index) => {
    if (!window.confirm("Remove this subject?")) return;
    const s = [...subjects]; s.splice(index, 1); setSubjects(s);
  };
  const saveAttendance = async () => {
    setAttendanceSaving(true);
    try {
      let totalAttended = 0, totalHeld = 0;
      const cleanedSubjects = subjects.map(s => {
        const attended = Number(s.attendedClasses || 0);
        const total = Number(s.totalClasses || 0);
        totalAttended += attended; totalHeld += total;
        return { subjectName: s.subjectName, subjectCode: s.subjectCode, attendedClasses: attended, totalClasses: total, attendancePercentage: total === 0 ? 0 : Math.round((attended / total) * 100), internalMarks: Number(s.internalMarks || 0) };
      });
      const overallAttendance = totalHeld === 0 ? 0 : Math.round((totalAttended / totalHeld) * 100);
      await updateDoc(doc(db, 'users', attendanceStudent.id), { subjects: cleanedSubjects, attendancePercentage: overallAttendance });
      setAllStudents(prev => prev.map(s => s.id === attendanceStudent.id ? { ...s, subjects: cleanedSubjects, attendancePercentage: overallAttendance } : s));
      closeAttendanceModal();
      alert("Attendance saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save attendance.");
    } finally { setAttendanceSaving(false); }
  };

  if (loading) return <div className="loader mx-auto mt-10"></div>;

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Users className="text-primary" /> Student Management
        </h2>
        <div className="relative w-64">
          <input type="text" placeholder="Search name, ID or email..." className="input pl-10" value={searchQuery} onChange={e => setSearchQuery(e.target.value.toLowerCase())} />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 gap-1 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'border-primary text-primary bg-primary-light'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
            {tab === 'Pending Approvals' && pendingStudents.length > 0 && (
              <span className="ml-2 bg-yellow-500 text-white text-xs rounded-full px-2 py-0.5">
                {pendingStudents.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── TAB: Approved Students ─── */}
      {activeTab === 'Approved' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="p-4 font-semibold text-gray-600">Student Name</th>
                  <th className="p-4 font-semibold text-gray-600">Student ID</th>
                  <th className="p-4 font-semibold text-gray-600">Contact</th>
                  <th className="p-4 font-semibold text-gray-600">Overall Attendance</th>
                  <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filterStudents(approvedStudents).length > 0 ? filterStudents(approvedStudents).map(student => (
                  <tr key={student.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="p-4 font-bold text-gray-900">{student.name}</td>
                    <td className="p-4 text-gray-700">{student.studentId}</td>
                    <td className="p-4 text-sm text-gray-500">
                      <div>{student.email}</div>
                      <div>{student.department} • Yr {student.year}</div>
                    </td>
                    <td className="p-4">
                      {student.attendancePercentage !== undefined ? (
                        <span className={`badge ${student.attendancePercentage >= 75 ? 'badge-success' : 'badge-danger'}`}>
                          {student.attendancePercentage}%
                        </span>
                      ) : <span className="text-gray-400 text-sm">No data</span>}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button onClick={() => openEditModal(student)} className="btn btn-outline py-1 px-3 text-sm inline-flex items-center gap-1">
                        <Edit size={14} /> Profile
                      </button>
                      <button onClick={() => openAttendanceModal(student)} className="btn btn-primary py-1 px-3 text-sm inline-flex items-center gap-1">
                        <GraduationCap size={14} />
                        {student.subjects && student.subjects.length > 0 ? 'Edit Attendance' : 'Add Attendance'}
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="5" className="p-8 text-center text-gray-500">No approved students found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB: Pending Approvals ─── */}
      {activeTab === 'Pending Approvals' && (
        <div>
          {pendingStudents.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed rounded-lg text-gray-400">
              <CheckCircle size={48} className="mx-auto mb-3 text-green-300" />
              <p className="font-medium">No pending approvals</p>
              <p className="text-sm">All registrations have been reviewed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filterStudents(pendingStudents).map(student => (
                <div key={student.id} className="bg-white rounded-lg border border-yellow-200 shadow-sm p-5" style={{ borderLeft: '4px solid #ca8a04' }}>
                  <div className="flex flex-wrap gap-4 justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold text-gray-900">{student.name}</span>
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">PENDING</span>
                      </div>
                      <p className="text-sm text-gray-600">{student.studentId} • {student.email}</p>
                      <p className="text-sm text-gray-500">{student.department} • Year {student.year} • Section {student.section}</p>
                      {student.registeredAt && (
                        <p className="text-xs text-gray-400 mt-1">
                          Registered: {new Date(student.registeredAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatus(student.id, 'approved', 'approve')}
                        className="btn py-2 px-4 text-sm font-semibold inline-flex items-center gap-2"
                        style={{ background: '#16a34a', color: '#fff', borderRadius: '0.5rem' }}
                      >
                        <CheckCircle size={16} /> ACCEPT
                      </button>
                      <button
                        onClick={() => updateStatus(student.id, 'rejected', 'reject')}
                        className="btn py-2 px-4 text-sm font-semibold inline-flex items-center gap-2"
                        style={{ background: '#dc2626', color: '#fff', borderRadius: '0.5rem' }}
                      >
                        <XCircle size={16} /> REJECT
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: Manage Students ─── */}
      {activeTab === 'Manage Students' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="p-4 font-semibold text-gray-600">Student Name</th>
                  <th className="p-4 font-semibold text-gray-600">Roll No.</th>
                  <th className="p-4 font-semibold text-gray-600">Email</th>
                  <th className="p-4 font-semibold text-gray-600">Dept / Year</th>
                  <th className="p-4 font-semibold text-gray-600">Status</th>
                  <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filterStudents(managedStudents).length > 0 ? filterStudents(managedStudents).map(student => {
                  const status = getStatus(student);
                  return (
                    <tr key={student.id} className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 ${status === 'removed' ? 'opacity-60' : ''}`}>
                      <td className="p-4 font-bold text-gray-900">{student.name}</td>
                      <td className="p-4 text-gray-700">{student.studentId}</td>
                      <td className="p-4 text-sm text-gray-500">{student.email}</td>
                      <td className="p-4 text-sm text-gray-500">{student.department} • Yr {student.year}</td>
                      <td className="p-4">
                        <span className={`badge ${status === 'approved' ? 'badge-success' : 'badge-danger'}`}>
                          {status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => setViewingStudent(student)}
                          className="btn btn-outline py-1 px-3 text-sm inline-flex items-center gap-1"
                        >
                          <Eye size={14} /> View
                        </button>
                        {status === 'approved' ? (
                          <button
                            onClick={() => updateStatus(student.id, 'removed', 'remove')}
                            className="btn py-1 px-3 text-sm inline-flex items-center gap-1"
                            style={{ background: '#dc2626', color: '#fff', borderRadius: '0.5rem' }}
                          >
                            <UserX size={14} /> REMOVE
                          </button>
                        ) : (
                          <button
                            onClick={() => updateStatus(student.id, 'approved', 'restore')}
                            className="btn py-1 px-3 text-sm inline-flex items-center gap-1"
                            style={{ background: '#16a34a', color: '#fff', borderRadius: '0.5rem' }}
                          >
                            <RotateCcw size={14} /> RESTORE
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan="6" className="p-8 text-center text-gray-500">No students found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── View Student Modal ─── */}
      {viewingStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-bold">Student Details</h3>
              <button onClick={() => setViewingStudent(null)} className="text-gray-500 hover:text-gray-800"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-3">
              {[
                ['Full Name', viewingStudent.name],
                ['Student ID', viewingStudent.studentId],
                ['Email', viewingStudent.email],
                ['Mobile', viewingStudent.mobile],
                ['Department', viewingStudent.department],
                ['Year / Section', `Year ${viewingStudent.year} - Section ${viewingStudent.section}`],
                ['Status', (viewingStudent.status || 'approved').toUpperCase()],
                ['Registered', viewingStudent.registeredAt ? new Date(viewingStudent.registeredAt).toLocaleString() : viewingStudent.createdAt ? new Date(viewingStudent.createdAt).toLocaleString() : '—'],
                ['Bus Assigned', viewingStudent.bus?.assigned ? `${viewingStudent.bus.busNumber} — ${viewingStudent.bus.routeName}` : 'Not Assigned'],
                ['Bus Fee', viewingStudent.bus?.feeStatus?.toUpperCase() || '—'],
                ['Library', viewingStudent.library?.subscriptionStatus?.toUpperCase() || '—'],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between text-sm border-b border-gray-50 pb-2">
                  <span className="text-gray-500 font-medium">{label}</span>
                  <span className="text-gray-800 font-semibold text-right max-w-[60%]">{val}</span>
                </div>
              ))}
            </div>
            <div className="p-6 border-t flex justify-end">
              <button onClick={() => setViewingStudent(null)} className="btn btn-primary px-6">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Profile Edit Modal ─── */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-bold">Edit Profile: {editingStudent.name}</h3>
              <button onClick={closeEditModal} className="text-gray-500 hover:text-gray-800"><X size={24} /></button>
            </div>
            <form onSubmit={saveChanges} className="p-6">
              <div className="space-y-4">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input type="text" name="name" className="input" value={editForm.name} onChange={handleEditChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Student ID</label>
                  <input type="text" name="studentId" className="input" value={editForm.studentId} onChange={handleEditChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile</label>
                  <input type="text" name="mobile" className="input" value={editForm.mobile} onChange={handleEditChange} required />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="form-group">
                    <label className="form-label">Dept</label>
                    <input type="text" name="department" className="input" value={editForm.department} onChange={handleEditChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Year</label>
                    <input type="text" name="year" className="input" value={editForm.year} onChange={handleEditChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Section</label>
                    <input type="text" name="section" className="input" value={editForm.section} onChange={handleEditChange} required />
                  </div>
                </div>
              </div>
              <div className="mt-8 flex justify-end gap-3 border-t pt-6">
                <button type="button" onClick={closeEditModal} className="btn btn-outline px-6">Cancel</button>
                <button type="submit" className="btn btn-primary px-6" disabled={saving}>
                  {saving ? 'Saving...' : <><Save size={18} className="mr-2" /> Save</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Attendance Edit Modal ─── */}
      {attendanceStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h3 className="text-xl font-bold">Manage Attendance & Marks</h3>
                <p className="text-sm text-gray-500 mt-1">{attendanceStudent.name} ({attendanceStudent.studentId})</p>
              </div>
              <button onClick={closeAttendanceModal} className="text-gray-500 hover:text-gray-800"><X size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-gray-700">Subject-wise Records</h4>
                <button onClick={addSubject} className="btn btn-outline py-1 px-3 text-sm flex items-center gap-1">
                  <Plus size={16} /> Add Subject
                </button>
              </div>
              {subjects.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed rounded-lg text-gray-500">
                  <GraduationCap size={48} className="mx-auto mb-3 text-gray-300" />
                  <p>No attendance data currently exists for this student.</p>
                  <p className="text-sm">Click "Add Subject" to begin tracking attendance.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {subjects.map((sub, idx) => (
                    <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200 relative">
                      <button onClick={() => removeSubject(idx)} className="absolute top-2 right-2 text-danger hover:text-red-700 p-1">
                        <Trash2 size={16} />
                      </button>
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        <div className="form-group col-span-2">
                          <label className="text-xs font-semibold text-gray-500 uppercase">Subject Name</label>
                          <input type="text" className="input bg-white py-1" value={sub.subjectName} onChange={e => handleSubjectChange(idx, 'subjectName', e.target.value)} placeholder="e.g. Data Structures" />
                        </div>
                        <div className="form-group">
                          <label className="text-xs font-semibold text-gray-500 uppercase">Code</label>
                          <input type="text" className="input bg-white py-1" value={sub.subjectCode} onChange={e => handleSubjectChange(idx, 'subjectCode', e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label className="text-xs font-semibold text-gray-500 uppercase">Attended</label>
                          <input type="number" className="input bg-white py-1" value={sub.attendedClasses} onChange={e => handleSubjectChange(idx, 'attendedClasses', e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label className="text-xs font-semibold text-gray-500 uppercase">Total</label>
                          <input type="number" className="input bg-white py-1" value={sub.totalClasses} onChange={e => handleSubjectChange(idx, 'totalClasses', e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label className="text-xs font-semibold text-gray-500 uppercase">Internal /30</label>
                          <input type="number" className="input bg-white py-1" value={sub.internalMarks} onChange={e => handleSubjectChange(idx, 'internalMarks', e.target.value)} />
                        </div>
                      </div>
                      <div className="mt-2 text-right">
                        <span className={`text-sm font-bold ${sub.attendancePercentage >= 75 ? 'text-success' : 'text-danger'}`}>
                          Attendance: {sub.attendancePercentage || 0}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-between items-center rounded-b-lg">
              <div className="text-sm text-gray-600">Overall attendance is auto-calculated on save.</div>
              <div className="flex gap-3">
                <button onClick={closeAttendanceModal} className="btn btn-outline px-6">Cancel</button>
                <button onClick={saveAttendance} className="btn btn-primary px-8" disabled={attendanceSaving}>
                  {attendanceSaving ? 'Saving...' : 'Save Attendance Data'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStudents;
