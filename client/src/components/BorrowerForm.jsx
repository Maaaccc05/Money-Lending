import React from 'react';

export const BorrowerForm = ({ initialData = null, onSubmit, isLoading = false, serverErrors = {} }) => {
  const [formData, setFormData] = React.useState(
    initialData || {
      name: '',
      surname: '',
      familyGroup: '',
      dob: '',
      address: '',
      panNumber: '',
      aadhaarNumber: '',
      bankAccountNumber: '',
      ifscCode: '',
      bankName: '',
      branch: '',
    }
  );

  const [errors, setErrors] = React.useState({});

  // Merge server errors into local errors whenever serverErrors changes
  React.useEffect(() => {
    if (Object.keys(serverErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...serverErrors }));
    }
  }, [serverErrors]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    const aadhaarRegex = /^[0-9]{12}$/;
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (formData.panNumber && !panRegex.test(formData.panNumber.toUpperCase())) {
      newErrors.panNumber = 'PAN must be in format: ABCDE1234F (5 letters, 4 digits, 1 letter)';
    }
    if (formData.aadhaarNumber && !aadhaarRegex.test(formData.aadhaarNumber)) {
      newErrors.aadhaarNumber = 'Aadhaar must be exactly 12 digits';
    }
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    // Only send panNumber if filled; otherwise strip it so sparse unique index is respected
    const payload = { ...formData, panNumber: formData.panNumber.toUpperCase() };
    if (!payload.panNumber) delete payload.panNumber;
    if (!payload.aadhaarNumber) delete payload.aadhaarNumber;
    if (!payload.bankAccountNumber) delete payload.bankAccountNumber;
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Name – REQUIRED */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.name ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>

        {/* Surname – optional */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Surname <span className="text-gray-400 text-xs font-normal">(optional)</span>
          </label>
          <input
            type="text"
            name="surname"
            value={formData.surname}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Family Group – optional */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Family Group <span className="text-gray-400 text-xs font-normal">(optional)</span>
          </label>
          <input
            type="text"
            name="familyGroup"
            value={formData.familyGroup}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Date of Birth – optional */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date of Birth <span className="text-gray-400 text-xs font-normal">(optional)</span>
          </label>
          <input
            type="date"
            name="dob"
            value={formData.dob}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* PAN Number – optional */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            PAN Number <span className="text-gray-400 text-xs font-normal">(optional)</span>
          </label>
          <input
            type="text"
            name="panNumber"
            value={formData.panNumber}
            onChange={handleChange}
            placeholder="ABCDE1234F"
            maxLength={10}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase ${
              errors.panNumber ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
          />
          {errors.panNumber && <p className="text-red-500 text-xs mt-1">{errors.panNumber}</p>}
        </div>

        {/* Aadhaar Number – optional */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Aadhaar Number <span className="text-gray-400 text-xs font-normal">(optional)</span>
          </label>
          <input
            type="text"
            name="aadhaarNumber"
            value={formData.aadhaarNumber}
            onChange={handleChange}
            placeholder="12-digit number"
            maxLength={12}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.aadhaarNumber ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
          />
          {errors.aadhaarNumber && <p className="text-red-500 text-xs mt-1">{errors.aadhaarNumber}</p>}
        </div>

        {/* Bank Account – optional */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bank Account <span className="text-gray-400 text-xs font-normal">(optional)</span>
          </label>
          <input
            type="text"
            name="bankAccountNumber"
            value={formData.bankAccountNumber}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* IFSC Code – optional */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            IFSC Code <span className="text-gray-400 text-xs font-normal">(optional)</span>
          </label>
          <input
            type="text"
            name="ifscCode"
            value={formData.ifscCode}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
          />
        </div>

        {/* Bank Name – optional */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bank Name <span className="text-gray-400 text-xs font-normal">(optional)</span>
          </label>
          <input
            type="text"
            name="bankName"
            value={formData.bankName}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Branch – optional */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Branch <span className="text-gray-400 text-xs font-normal">(optional)</span>
          </label>
          <input
            type="text"
            name="branch"
            value={formData.branch}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Address – optional */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Address <span className="text-gray-400 text-xs font-normal">(optional)</span>
        </label>
        <textarea
          name="address"
          value={formData.address}
          onChange={handleChange}
          rows="3"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
      >
        {isLoading ? 'Saving...' : 'Save Borrower'}
      </button>
    </form>
  );
};

export default BorrowerForm;
