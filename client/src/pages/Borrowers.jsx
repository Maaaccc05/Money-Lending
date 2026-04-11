import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, Navbar, BorrowerForm } from '../components/index';
import { borrowerAPI } from '../services/api';
import { Plus, AlertCircle, Pencil, X, CheckCircle, Users, ChevronDown, ChevronUp } from 'lucide-react';

const DeleteConfirmModal = ({ title, message, onCancel, onConfirm, isLoading }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
      <div className="px-6 py-4 border-b bg-red-50">
        <h3 className="text-lg font-bold text-red-700">{title}</h3>
      </div>
      <div className="px-6 py-5 text-sm text-gray-700">{message}</div>
      <div className="px-6 py-4 border-t flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-200 transition"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50"
        >
          {isLoading ? 'Deleting...' : 'Confirm Delete'}
        </button>
      </div>
    </div>
  </div>
);

// ── Edit Modal ────────────────────────────────────────────────────────────────
const EditBorrowerModal = ({ borrower, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: borrower.name || '',
    surname: borrower.surname || '',
    familyGroup: borrower.familyGroup || '',
    dob: borrower.dob ? borrower.dob.slice(0, 10) : '',
    address: borrower.address || '',
    panNumber: '',
    aadhaarNumber: '',
    bankAccountNumber: '',
    ifscCode: borrower.ifscCode || '',
    bankName: borrower.bankName || '',
    branch: borrower.branch || '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Name is required';
    if (formData.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panNumber.toUpperCase()))
      errs.panNumber = 'PAN must be in format: ABCDE1234F';
    if (formData.aadhaarNumber && !/^[0-9]{12}$/.test(formData.aadhaarNumber))
      errs.aadhaarNumber = 'Aadhaar must be exactly 12 digits';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setIsLoading(true);
    setServerError('');
    try {
      const payload = { ...formData, panNumber: formData.panNumber.toUpperCase() };
      // Remove blank sensitive fields so they don't overwrite
      if (!payload.panNumber) delete payload.panNumber;
      if (!payload.aadhaarNumber) delete payload.aadhaarNumber;
      if (!payload.bankAccountNumber) delete payload.bankAccountNumber;
      const { data } = await borrowerAPI.update(borrower._id, payload);
      onSave(data.borrower);
    } catch (err) {
      const srvErrs = err.response?.data?.errors;
      if (srvErrs?.length > 0) {
        const mapped = {};
        srvErrs.forEach(({ field, message }) => { mapped[field] = message; });
        setErrors(mapped);
      } else {
        setServerError(err.response?.data?.message || 'Failed to update borrower');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const field = (label, name, type = 'text', extra = {}) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={formData[name]}
        onChange={handleChange}
        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          errors[name] ? 'border-red-500 bg-red-50' : 'border-gray-300'
        } ${name === 'panNumber' || name === 'ifscCode' ? 'uppercase' : ''}`}
        {...extra}
      />
      {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name]}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-2xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Pencil size={18} /> Edit Borrower
          </h2>
          <button onClick={onClose} className="text-white/80 hover:text-white transition">
            <X size={22} />
          </button>
        </div>

        {serverError && (
          <div className="mx-6 mt-4 bg-red-100 text-red-700 p-3 rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle size={16} /> {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field('Name *', 'name')}
            {field('Surname (optional)', 'surname')}
            {field('Family Group (optional)', 'familyGroup')}
            {field('Date of Birth (optional)', 'dob', 'date')}
            {field('PAN Number (optional – leave blank to keep existing)', 'panNumber', 'text', { placeholder: 'ABCDE1234F', maxLength: 10 })}
            {field('Aadhaar Number (optional – leave blank to keep existing)', 'aadhaarNumber', 'text', { placeholder: '12-digit number', maxLength: 12 })}
            {field('Bank Account (optional – leave blank to keep existing)', 'bankAccountNumber')}
            {field('IFSC Code (optional)', 'ifscCode')}
            {field('Bank Name (optional)', 'bankName')}
            {field('Branch (optional)', 'branch')}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address <span className="text-gray-400 text-xs font-normal">(optional)</span></label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={2}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.address ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-200 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Family Group Section ──────────────────────────────────────────────────────
const FamilyGroupSection = ({ groupName, borrowers, onEdit, onDelete }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-4">
      {/* Group header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 sm:px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b hover:from-blue-100 hover:to-indigo-100 transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
            <Users size={16} className="text-white" />
          </div>
          <div className="text-left">
            <span className="font-bold text-gray-800 text-base">{groupName} Family</span>
            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {borrowers.length} {borrowers.length === 1 ? 'borrower' : 'borrowers'}
            </span>
          </div>
        </div>
        {collapsed ? <ChevronDown size={18} className="text-gray-500" /> : <ChevronUp size={18} className="text-gray-500" />}
      </button>

      {!collapsed && (
        <>
          {/* ── Mobile: card list (hidden on sm+) ── */}
          <div className="divide-y divide-gray-100 sm:hidden">
            {borrowers.map((b) => (
              <div key={b._id} className="px-4 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{b.name} {b.surname}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{b.bankName} · {b.branch}</p>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => onEdit(b)}
                    className="inline-flex items-center justify-center gap-1 text-xs min-w-[72px] h-8 bg-blue-100 text-blue-700 px-2.5 rounded-lg hover:bg-blue-200 font-medium transition"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    onClick={() => onDelete(b)}
                    className="inline-flex items-center justify-center text-xs min-w-[72px] h-8 bg-red-100 text-red-700 px-2.5 rounded-lg hover:bg-red-200 font-medium transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ── Desktop: table (hidden below sm) ── */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="w-[28%] px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="w-[16%] px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">DOB</th>
                  <th className="w-[18%] px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Bank</th>
                  <th className="w-[16%] px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Branch</th>
                  <th className="w-[22%] px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {borrowers.map((b) => (
                  <tr key={b._id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-3.5 text-sm font-medium text-gray-900 truncate">{b.name} {b.surname}</td>
                    <td className="px-6 py-3.5 text-sm text-gray-600 whitespace-nowrap">{b.dob ? new Date(b.dob).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="px-6 py-3.5 text-sm text-gray-600 truncate">{b.bankName}</td>
                    <td className="px-6 py-3.5 text-sm text-gray-600 truncate">{b.branch}</td>
                    <td className="px-6 py-3.5 align-middle">
                      <div className="flex items-center justify-start gap-2">
                        <button
                          onClick={() => onEdit(b)}
                          className="inline-flex items-center justify-center gap-1.5 text-xs min-w-[80px] h-8 bg-blue-100 text-blue-700 px-3 rounded-lg hover:bg-blue-200 font-medium transition"
                        >
                          <Pencil size={13} /> Edit
                        </button>
                        <button
                          onClick={() => onDelete(b)}
                          className="inline-flex items-center justify-center text-xs min-w-[80px] h-8 bg-red-100 text-red-700 px-3 rounded-lg hover:bg-red-200 font-medium transition"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export const Borrowers = () => {
  const [grouped, setGrouped] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [editingBorrower, setEditingBorrower] = useState(null);
  const [deletingBorrower, setDeletingBorrower] = useState(null);
  const [isDeletingBorrower, setIsDeletingBorrower] = useState(false);

  const fetchBorrowers = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const { data } = await borrowerAPI.getAllGrouped();
      setGrouped(data.grouped || {});
    } catch {
      setError('Failed to fetch borrowers');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchBorrowers(); }, [fetchBorrowers]);

  // Auto-dismiss success
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3500);
      return () => clearTimeout(t);
    }
  }, [success]);

  const handleCreateBorrower = async (data) => {
    setFieldErrors({});
    setError('');
    try {
      await borrowerAPI.create(data);
      setShowForm(false);
      setSuccess('Borrower added successfully!');
      fetchBorrowers();
    } catch (err) {
      const srvErrs = err.response?.data?.errors;
      if (srvErrs?.length > 0) {
        const mapped = {};
        srvErrs.forEach(({ field, message }) => { mapped[field] = message; });
        setFieldErrors(mapped);
        setError('Please fix the highlighted fields below.');
      } else {
        setError(err.response?.data?.message || 'Failed to create borrower');
      }
    }
  };

  const handleSaveEdit = () => {
    setEditingBorrower(null);
    setSuccess('Borrower updated successfully!');
    fetchBorrowers();
  };

  const handleDeleteBorrower = async () => {
    if (!deletingBorrower?._id) return;
    setIsDeletingBorrower(true);
    setError('');
    try {
      await borrowerAPI.delete(deletingBorrower._id);
      setDeletingBorrower(null);
      setSuccess('Deleted successfully');
      await fetchBorrowers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete borrower');
    } finally {
      setIsDeletingBorrower(false);
    }
  };

  // Convert grouped object → sorted array of [groupName, members[]]
  const sortedGroups = React.useMemo(() => {
    return Object.entries(grouped)
      .sort(([a], [b]) => {
        if (a === 'Other Family') return 1;
        if (b === 'Other Family') return -1;
        return a.localeCompare(b);
      })
      .map(([groupName, members]) => [
        groupName,
        [...members].sort((x, y) =>
          `${x.name} ${x.surname}`.localeCompare(`${y.name} ${y.surname}`)
        ),
      ]);
  }, [grouped]);

  return (
    <div className="flex w-full overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 min-w-0 lg:ml-64">
        <Navbar />
        <div className="pt-20 px-4 sm:px-6 lg:px-8 py-6 bg-gray-50 min-h-screen w-full max-w-full">

          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Borrowers</h1>
              <p className="text-gray-500 text-sm mt-1">Grouped by family</p>
            </div>
            <button
              onClick={() => { setShowForm(true); setError(''); setFieldErrors({}); }}
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 font-medium shadow-md shadow-blue-200 transition"
            >
              <Plus size={20} /> Add Borrower
            </button>
          </div>

          {/* Success toast */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl mb-5 flex items-center gap-2 animate-pulse">
              <CheckCircle size={18} /> {success}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-100 text-red-700 p-4 rounded-xl mb-5 flex items-center gap-2">
              <AlertCircle size={18} /> {error}
            </div>
          )}

          {/* Add Form */}
          {showForm && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Add New Borrower</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 transition">
                  <X size={20} />
                </button>
              </div>
              <BorrowerForm onSubmit={handleCreateBorrower} isLoading={isLoading} serverErrors={fieldErrors} />
            </div>
          )}

          {/* Content */}
          {isLoading ? (
            <div className="text-center py-16 text-gray-500">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
              Loading borrowers...
            </div>
          ) : sortedGroups.length === 0 ? (
            <div className="text-center py-16 text-gray-500 bg-white rounded-2xl shadow-sm">
              <Users size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No borrowers found</p>
              <p className="text-sm mt-1">Click "Add Borrower" to get started</p>
            </div>
          ) : (
            <div>
              {sortedGroups.map(([groupName, members]) => (
                <FamilyGroupSection
                  key={groupName}
                  groupName={groupName}
                  borrowers={members}
                  onEdit={setEditingBorrower}
                  onDelete={setDeletingBorrower}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingBorrower && (
        <EditBorrowerModal
          borrower={editingBorrower}
          onClose={() => setEditingBorrower(null)}
          onSave={handleSaveEdit}
        />
      )}

      {deletingBorrower && (
        <DeleteConfirmModal
          title="Delete Borrower"
          message="Are you sure you want to delete this borrower?"
          onCancel={() => setDeletingBorrower(null)}
          onConfirm={handleDeleteBorrower}
          isLoading={isDeletingBorrower}
        />
      )}
    </div>
  );
};

export default Borrowers;
