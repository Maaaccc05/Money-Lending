import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, Navbar, LenderForm } from '../components/index';
import { lenderAPI } from '../services/api';
import { Plus, AlertCircle, Pencil, X, CheckCircle, Users, ChevronDown, ChevronUp } from 'lucide-react';

// ── Edit Modal ────────────────────────────────────────────────────────────────
const EditLenderModal = ({ lender, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: lender.name || '',
    surname: lender.surname || '',
    familyGroup: lender.familyGroup || '',
    dob: lender.dob ? lender.dob.slice(0, 10) : '',
    address: lender.address || '',
    panNumber: '',
    aadhaarNumber: '',
    bankAccountNumber: '',
    ifscCode: lender.ifscCode || '',
    bankName: lender.bankName || '',
    branch: lender.branch || '',
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
    if (!formData.surname.trim()) errs.surname = 'Surname is required';
    if (!formData.familyGroup.trim()) errs.familyGroup = 'Family group is required';
    if (!formData.dob) errs.dob = 'Date of birth is required';
    if (!formData.address.trim()) errs.address = 'Address is required';
    if (formData.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panNumber.toUpperCase()))
      errs.panNumber = 'PAN must be in format: ABCDE1234F';
    if (formData.aadhaarNumber && !/^[0-9]{12}$/.test(formData.aadhaarNumber))
      errs.aadhaarNumber = 'Aadhaar must be exactly 12 digits';
    if (!formData.ifscCode.trim()) errs.ifscCode = 'IFSC code is required';
    if (!formData.bankName.trim()) errs.bankName = 'Bank name is required';
    if (!formData.branch.trim()) errs.branch = 'Branch is required';
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
      if (!payload.panNumber) delete payload.panNumber;
      if (!payload.aadhaarNumber) delete payload.aadhaarNumber;
      if (!payload.bankAccountNumber) delete payload.bankAccountNumber;
      const { data } = await lenderAPI.update(lender._id, payload);
      onSave(data.lender);
    } catch (err) {
      const srvErrs = err.response?.data?.errors;
      if (srvErrs?.length > 0) {
        const mapped = {};
        srvErrs.forEach(({ field, message }) => { mapped[field] = message; });
        setErrors(mapped);
      } else {
        setServerError(err.response?.data?.message || 'Failed to update lender');
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
        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
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
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-purple-600 to-indigo-700 rounded-t-2xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Pencil size={18} /> Edit Lender
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
          <div className="grid grid-cols-2 gap-4">
            {field('Name', 'name')}
            {field('Surname', 'surname')}
            {field('Family Group', 'familyGroup')}
            {field('Date of Birth', 'dob', 'date')}
            {field('PAN Number (leave blank to keep existing)', 'panNumber', 'text', { placeholder: 'ABCDE1234F', maxLength: 10 })}
            {field('Aadhaar Number (leave blank to keep existing)', 'aadhaarNumber', 'text', { placeholder: '12-digit number', maxLength: 12 })}
            {field('Bank Account (leave blank to keep existing)', 'bankAccountNumber')}
            {field('IFSC Code', 'ifscCode')}
            {field('Bank Name', 'bankName')}
            {field('Branch', 'branch')}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={2}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.address ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-purple-600 text-white py-2.5 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50"
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
const FamilyGroupSection = ({ groupName, lenders, onEdit }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-4">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b hover:from-purple-100 hover:to-indigo-100 transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
            <Users size={16} className="text-white" />
          </div>
          <div className="text-left">
            <span className="font-bold text-gray-800 text-base">{groupName} Family</span>
            <span className="ml-3 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
              {lenders.length} {lenders.length === 1 ? 'lender' : 'lenders'}
            </span>
          </div>
        </div>
        {collapsed ? <ChevronDown size={18} className="text-gray-500" /> : <ChevronUp size={18} className="text-gray-500" />}
      </button>

      {!collapsed && (
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">DOB</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Bank</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Branch</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Address</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {lenders.map((l) => (
              <tr key={l._id} className="hover:bg-purple-50/30 transition-colors">
                <td className="px-6 py-3.5 text-sm font-medium text-gray-900">
                  {l.name} {l.surname}
                </td>
                <td className="px-6 py-3.5 text-sm text-gray-600">
                  {new Date(l.dob).toLocaleDateString('en-IN')}
                </td>
                <td className="px-6 py-3.5 text-sm text-gray-600">{l.bankName}</td>
                <td className="px-6 py-3.5 text-sm text-gray-600">{l.branch}</td>
                <td className="px-6 py-3.5 text-sm text-gray-600 max-w-xs truncate">{l.address}</td>
                <td className="px-6 py-3.5">
                  <button
                    onClick={() => onEdit(l)}
                    className="flex items-center gap-1.5 text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-200 font-medium transition"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export const Lenders = () => {
  const [lenders, setLenders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [editingLender, setEditingLender] = useState(null);

  const fetchLenders = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await lenderAPI.getAllGrouped();
      setLenders(data.lenders);
    } catch {
      setError('Failed to fetch lenders');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchLenders(); }, [fetchLenders]);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3500);
      return () => clearTimeout(t);
    }
  }, [success]);

  const handleCreateLender = async (data) => {
    setFieldErrors({});
    setError('');
    try {
      await lenderAPI.create(data);
      setShowForm(false);
      setSuccess('Lender added successfully!');
      fetchLenders();
    } catch (err) {
      const srvErrs = err.response?.data?.errors;
      if (srvErrs?.length > 0) {
        const mapped = {};
        srvErrs.forEach(({ field, message }) => { mapped[field] = message; });
        setFieldErrors(mapped);
        setError('Please fix the highlighted fields below.');
      } else {
        setError(err.response?.data?.message || 'Failed to create lender');
      }
    }
  };

  const handleSaveEdit = (updatedLender) => {
    setLenders((prev) =>
      prev.map((l) => (l._id === updatedLender._id ? updatedLender : l))
    );
    setEditingLender(null);
    setSuccess('Lender updated successfully!');
  };

  const grouped = React.useMemo(() => {
    const map = {};
    lenders.forEach((l) => {
      const key = (l.familyGroup || 'Uncategorized').trim();
      if (!map[key]) map[key] = [];
      map[key].push(l);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [lenders]);

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Navbar />
        <div className="pt-20 p-6 bg-gray-50 min-h-screen">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Lenders</h1>
              <p className="text-gray-500 text-sm mt-1">Grouped by family</p>
            </div>
            <button
              onClick={() => { setShowForm(true); setError(''); setFieldErrors({}); }}
              className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-xl hover:bg-purple-700 font-medium shadow-md shadow-purple-200 transition"
            >
              <Plus size={20} /> Add Lender
            </button>
          </div>

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl mb-5 flex items-center gap-2">
              <CheckCircle size={18} /> {success}
            </div>
          )}

          {error && (
            <div className="bg-red-100 text-red-700 p-4 rounded-xl mb-5 flex items-center gap-2">
              <AlertCircle size={18} /> {error}
            </div>
          )}

          {showForm && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Add New Lender</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 transition">
                  <X size={20} />
                </button>
              </div>
              <LenderForm onSubmit={handleCreateLender} isLoading={isLoading} serverErrors={fieldErrors} />
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-16 text-gray-500">
              <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-3" />
              Loading lenders...
            </div>
          ) : grouped.length === 0 ? (
            <div className="text-center py-16 text-gray-500 bg-white rounded-2xl shadow-sm">
              <Users size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No lenders found</p>
              <p className="text-sm mt-1">Click "Add Lender" to get started</p>
            </div>
          ) : (
            <div>
              {grouped.map(([groupName, members]) => (
                <FamilyGroupSection
                  key={groupName}
                  groupName={groupName}
                  lenders={members}
                  onEdit={setEditingLender}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {editingLender && (
        <EditLenderModal
          lender={editingLender}
          onClose={() => setEditingLender(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
};

export default Lenders;
