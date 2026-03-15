import React from 'react';
import { Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

export const InterestTable = ({ interests = [], onMarkPaid, pagination }) => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Loan ID</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Borrower Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Lender Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Principal</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Borrower Interest</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Lender Interest</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Rate</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Days</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">End Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {interests.map((interest) => (
              <tr key={interest._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">{interest.loanId}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{interest.borrowerName || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{interest.lenderName || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-900">₹{Number(interest.principal || 0).toLocaleString('en-IN')}</td>
                <td className="px-6 py-4 text-sm font-semibold text-gray-900">₹{Number(interest.borrowerInterest || 0).toLocaleString('en-IN')}</td>
                <td className="px-6 py-4 text-sm font-semibold text-gray-900">₹{Number(interest.lenderInterest || 0).toLocaleString('en-IN')}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{interest.rate}%</td>
                <td className="px-6 py-4 text-sm text-gray-900">{interest.days}</td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {interest.endDate ? new Date(interest.endDate).toLocaleDateString('en-IN') : '-'}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      interest.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {interest.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  {interest.status === 'pending' && onMarkPaid && (
                    <button
                      onClick={() => onMarkPaid(interest._id)}
                      className="text-green-600 hover:text-green-800 text-xs font-semibold"
                    >
                      Mark Paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="px-6 py-4 border-t flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Page {pagination.page} of {pagination.pages} ({pagination.total} total)
          </p>
          <div className="flex gap-2">
            {pagination.page > 1 && (
              <button className="p-2 hover:bg-gray-100 rounded">
                <ChevronLeft size={18} />
              </button>
            )}
            {pagination.page < pagination.pages && (
              <button className="p-2 hover:bg-gray-100 rounded">
                <ChevronRight size={18} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InterestTable;
