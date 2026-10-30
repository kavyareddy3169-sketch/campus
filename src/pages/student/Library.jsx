import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Search, BookMarked, CheckCircle, XCircle } from 'lucide-react';

const StudentLibrary = () => {
  const { userData } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  if (!userData) return <div className="loader mx-auto mt-10"></div>;

  const library = userData.library || { subscriptionStatus: 'inactive', booksBorrowed: 0, subscriptionExpiry: null };

  // Hardcoded books for the UI search since there isn't a books collection mentioned in requirements
  // But we could pull from a books collection if one existed.
  const allBooks = [
    { id: 1, title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', category: 'Computer Science', available: true },
    { id: 2, title: 'Clean Code', author: 'Robert C. Martin', category: 'Software Engineering', available: false },
    { id: 3, title: 'Design Patterns', author: 'Erich Gamma', category: 'Software Engineering', available: true },
    { id: 4, title: 'Database System Concepts', author: 'Abraham Silberschatz', category: 'Database', available: true },
    { id: 5, title: 'Computer Networks', author: 'Andrew S. Tanenbaum', category: 'Networking', available: true }
  ];

  const filteredBooks = allBooks.filter(b => 
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <h2 className="text-2xl font-bold mb-6">Digital Library</h2>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="card bg-gradient-to-br from-primary to-[#6D48E5] text-white">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm opacity-80 font-medium">Subscription Status</p>
              <h3 className="text-2xl font-bold mt-1">
                {library.subscriptionStatus === 'active' ? 'ACTIVE' : 'INACTIVE'}
              </h3>
            </div>
            <div className="p-2 bg-white bg-opacity-20 rounded-lg">
              <BookOpen size={24} />
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-white border-opacity-20">
            {library.subscriptionStatus === 'active' ? (
              <p className="text-sm flex items-center gap-2">
                <CheckCircle size={16} />
                Valid till: {library.subscriptionExpiry ? new Date(library.subscriptionExpiry).toLocaleDateString() : 'N/A'}
              </p>
            ) : (
              <p className="text-sm flex items-center gap-2 text-red-200 font-medium">
                <XCircle size={16} />
                Please renew your subscription
              </p>
            )}
          </div>
        </div>

        <div className="card">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm text-gray-500 font-medium">Books Borrowed</p>
              <h3 className="text-3xl font-bold mt-1">{library.booksBorrowed}</h3>
            </div>
            <div className="p-2 bg-secondary rounded-lg bg-opacity-10" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
              <BookMarked className="text-secondary" size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4 pt-4 border-t">
            {library.subscriptionStatus === 'active' 
              ? 'You can borrow up to 3 books at a time.' 
              : 'Subscription required to borrow books.'}
          </p>
        </div>
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold">Search Catalog</h3>
          <div className="relative w-64">
            <input 
              type="text" 
              placeholder="Search books, authors..." 
              className="input pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="pb-3 font-semibold text-gray-600">Title</th>
                <th className="pb-3 font-semibold text-gray-600">Author</th>
                <th className="pb-3 font-semibold text-gray-600">Category</th>
                <th className="pb-3 font-semibold text-gray-600">Status</th>
                <th className="pb-3 font-semibold text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredBooks.map((book) => (
                <tr key={book.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 font-medium text-gray-900">{book.title}</td>
                  <td className="py-4 text-gray-600">{book.author}</td>
                  <td className="py-4 text-gray-500 text-sm">{book.category}</td>
                  <td className="py-4">
                    <span className={`badge ${book.available ? 'badge-success' : 'badge-danger'}`}>
                      {book.available ? 'Available' : 'Issued'}
                    </span>
                  </td>
                  <td className="py-4">
                    <button 
                      className="btn btn-outline py-1 px-3 text-sm disabled:opacity-50"
                      disabled={!book.available || library.subscriptionStatus !== 'active'}
                    >
                      Request
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentLibrary;
