import React from 'react';
import { Eye, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

export const LoanTable = ({ loans = [], onView, onEdit, onDelete, pagination }) => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">

      {/* ── Mobile: card list (hidden on sm+) ── */}
      <div className="divide-y divide-gray-100 sm:hidden">
        {loans.map((loan) => (
          <div key={loan._id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{loan.loanId}</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {loan.borrowerId?.name} {loan.borrowerId?.surname}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className="text-xs font-medium text-gray-800">₹{loan.totalLoanAmount.toLocaleString()}</span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-600">{loan.interestRateAnnual}% p.a.</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      loan.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {loan.status}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0 mt-0.5">
                {onView && (
                  <button onClick={() => onView(loan.loanId)} className="text-blue-600 hover:text-blue-800 p-1">
                    <Eye size={18} />
                  </button>
                )}
                {onEdit && (
                  <button onClick={() => onEdit(loan._id)} className="text-yellow-600 hover:text-yellow-800 p-1">
                    <Edit size={18} />
                  </button>
                )}
                {onDelete && (
                  <button onClick={() => onDelete(loan._id)} className="text-red-600 hover:text-red-800 p-1">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Desktop: table (hidden below sm) ── */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Loan ID</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Borrower</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Rate</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Lenders</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loans.map((loan) => (
              <tr key={loan._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">{loan.loanId}</td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {loan.borrowerId?.name} {loan.borrowerId?.surname}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">₹{loan.totalLoanAmount.toLocaleString()}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{loan.interestRateAnnual}%</td>
                <td className="px-6 py-4 text-sm text-gray-900">{loan.lenders?.length}</td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      loan.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {loan.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm flex gap-2">
                  {onView && (
                    <button onClick={() => onView(loan.loanId)} className="text-blue-600 hover:text-blue-800">
                      <Eye size={18} />
                    </button>
                  )}
                  {onEdit && (
                    <button onClick={() => onEdit(loan._id)} className="text-yellow-600 hover:text-yellow-800">
                      <Edit size={18} />
                    </button>
                  )}
                  {onDelete && (
                    <button onClick={() => onDelete(loan._id)} className="text-red-600 hover:text-red-800">
                      <Trash2 size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="px-4 sm:px-6 py-4 border-t flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Page {pagination.page} of {pagination.pages} ({pagination.total} total)
          </p>
          <div className="flex gap-2">
            {pagination.page > 1 && (
              <button className="p-2 hover:bg-gray-100 rounded"><ChevronLeft size={18} /></button>
            )}
            {pagination.page < pagination.pages && (
              <button className="p-2 hover:bg-gray-100 rounded"><ChevronRight size={18} /></button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanTable;
