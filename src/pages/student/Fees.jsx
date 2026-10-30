import { useAuth } from '../../context/AuthContext';
import { CreditCard, CheckCircle, XCircle } from 'lucide-react';

const StudentFees = () => {
  const { userData } = useAuth();

  if (!userData) return <div className="loader mx-auto mt-10"></div>;

  const examFee = userData.examFee || { amount: 0, status: 'unpaid' };
  const bus = userData.bus || { feeAmount: 0, feeStatus: 'unpaid', assigned: false };
  const library = userData.library || { subscriptionStatus: 'inactive' };

  // Calculate library fee (if inactive, they might need to pay. If active, it's paid. We assume standard 1200 amount).
  const libraryFeeAmount = 1200;
  const libraryFeeStatus = library.subscriptionStatus === 'active' ? 'paid' : 'unpaid';

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <h2 className="text-2xl font-bold mb-6">Fees & Payments</h2>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        
        {/* Semester Exam Fee */}
        <div className="card">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold">Semester Exam Fee</h3>
              <p className="text-sm text-gray-500">Regular Semester Evaluation</p>
            </div>
            <div className="p-2 bg-primary-light rounded-lg">
              <CreditCard className="text-primary" size={24} />
            </div>
          </div>
          
          <div className="mt-4 mb-6">
            <h4 className="text-3xl font-bold text-gray-900">₹{examFee.amount}</h4>
          </div>
          
          <div className="flex items-center justify-between border-t pt-4">
            <span className={`badge ${examFee.status === 'paid' ? 'badge-success' : 'badge-danger'} px-3 py-1.5 flex items-center gap-1.5`}>
              {examFee.status === 'paid' ? <CheckCircle size={16} /> : <XCircle size={16} />}
              {examFee.status?.toUpperCase() || 'UNPAID'}
            </span>
            {examFee.status !== 'paid' && (
              <button className="btn btn-primary text-sm py-1.5">Pay Now</button>
            )}
          </div>
        </div>

        {/* Smart Bus Fee */}
        {bus.assigned ? (
          <div className="card">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold">Smart Bus Fee</h3>
                <p className="text-sm text-gray-500">Transport & Tracking Access</p>
              </div>
              <div className="p-2 bg-primary-light rounded-lg">
                <CreditCard className="text-primary" size={24} />
              </div>
            </div>
            
            <div className="mt-4 mb-6">
              <h4 className="text-3xl font-bold text-gray-900">₹{bus.feeAmount}</h4>
            </div>
            
            <div className="flex items-center justify-between border-t pt-4">
              <span className={`badge ${bus.feeStatus === 'paid' ? 'badge-success' : 'badge-danger'} px-3 py-1.5 flex items-center gap-1.5`}>
                {bus.feeStatus === 'paid' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                {bus.feeStatus?.toUpperCase() || 'UNPAID'}
              </span>
              {bus.feeStatus !== 'paid' && (
                <button className="btn btn-primary text-sm py-1.5">Pay Now</button>
              )}
            </div>
          </div>
        ) : (
           <div className="card flex items-center justify-center text-center">
             <div>
               <h3 className="text-lg font-bold mb-2 text-gray-400">Smart Bus Fee</h3>
               <p className="text-gray-400 text-sm">Not applicable (Bus not assigned)</p>
             </div>
           </div>
        )}

        {/* Library Subscription */}
        <div className="card md:col-span-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-secondary rounded-lg bg-opacity-10" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
                <CreditCard className="text-secondary" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold">Library Subscription</h3>
                <p className="text-sm text-gray-500">Access to books and digital resources</p>
              </div>
            </div>
            <div className="text-right">
              <h4 className="text-xl font-bold text-gray-900 mb-1">₹{libraryFeeAmount}</h4>
              <span className={`badge ${libraryFeeStatus === 'paid' ? 'badge-success' : 'badge-danger'} flex items-center gap-1.5 justify-center`}>
                {libraryFeeStatus === 'paid' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                {libraryFeeStatus?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StudentFees;
