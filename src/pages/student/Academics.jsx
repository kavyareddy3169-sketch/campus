import { useAuth } from '../../context/AuthContext';
import { GraduationCap, BarChart } from 'lucide-react';

const StudentAcademics = () => {
  const { userData } = useAuth();

  if (!userData) return <div className="loader mx-auto mt-10"></div>;

  const subjects = userData.subjects || [];

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <h2 className="text-2xl font-bold mb-6">Academic Information</h2>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="card md:col-span-2">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
            <BarChart className="text-primary" /> Subject-wise Attendance
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="pb-3 font-semibold text-gray-600">Subject</th>
                  <th className="pb-3 font-semibold text-gray-600">Code</th>
                  <th className="pb-3 font-semibold text-gray-600">Classes (Attended / Total)</th>
                  <th className="pb-3 font-semibold text-gray-600">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {subjects.length > 0 ? subjects.map((sub, idx) => (
                  <tr key={idx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="py-3 font-medium text-gray-900">{sub.subjectName}</td>
                    <td className="py-3 text-gray-600">{sub.subjectCode}</td>
                    <td className="py-3">{sub.attendedClasses || 0} / {sub.totalClasses || 0}</td>
                    <td className="py-3">
                      <span className={`badge ${sub.attendancePercentage >= 75 ? 'badge-success' : 'badge-danger'}`}>
                        {sub.attendancePercentage || 0}%
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="4" className="text-center py-8 text-gray-500">No attendance data available.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
            <GraduationCap className="text-primary" /> Internal Marks
          </h3>
          <div className="space-y-4">
            {subjects.length > 0 ? subjects.map((sub, idx) => (
              <div key={idx} className="flex justify-between items-center border-b pb-3 last:border-0 last:pb-0">
                <span className="text-gray-700 font-medium">{sub.subjectName}</span>
                <div className="text-right">
                  <span className="font-bold text-lg text-gray-900">{sub.internalMarks || 0}</span>
                  <span className="text-gray-500 text-sm"> / 30</span>
                </div>
              </div>
            )) : (
              <p className="text-gray-500 text-sm text-center py-4">No marks published yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAcademics;
