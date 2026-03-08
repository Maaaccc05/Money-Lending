import { useForm } from 'react-hook-form';
import { useState } from 'react';

export default function PersonForm({ title, onSubmit, defaultValues = {}, loading }) {
    const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues });

    return (
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Personal Info */}
            <div>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
                    Personal Information
                </h3>
                <div className="grid-2" style={{ gap: '1rem' }}>
                    <div className="form-group">
                        <label className="form-label">First Name *</label>
                        <input className="form-input" placeholder="First name" {...register('name', { required: 'First name is required' })} />
                        {errors.name && <span className="form-error">{errors.name.message}</span>}
                    </div>
                    <div className="form-group">
                        <label className="form-label">Surname *</label>
                        <input className="form-input" placeholder="Surname" {...register('surname', { required: 'Surname is required' })} />
                        {errors.surname && <span className="form-error">{errors.surname.message}</span>}
                    </div>
                    <div className="form-group">
                        <label className="form-label">Family Group</label>
                        <input className="form-input" placeholder="e.g. Sharma Family" {...register('familyGroup')} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Date of Birth *</label>
                        <input className="form-input" type="date" {...register('dob', { required: 'Date of birth is required' })} />
                        {errors.dob && <span className="form-error">{errors.dob.message}</span>}
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Address</label>
                        <textarea className="form-input" placeholder="Full address" rows={2} style={{ resize: 'vertical' }} {...register('address')} />
                    </div>
                </div>
            </div>

            {/* ID Documents */}
            <div>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
                    Identity Documents
                </h3>
                <div className="grid-2">
                    <div className="form-group">
                        <label className="form-label">PAN Number</label>
                        <input className="form-input" placeholder="ABCDE1234F" style={{ textTransform: 'uppercase' }} {...register('panNumber')} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Aadhaar Number</label>
                        <input className="form-input" placeholder="1234 5678 9012" {...register('aadhaarNumber')} />
                    </div>
                </div>
            </div>

            {/* Bank Details */}
            <div>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
                    Bank Details
                </h3>
                <div className="grid-2">
                    <div className="form-group">
                        <label className="form-label">Bank Account Number</label>
                        <input className="form-input" placeholder="Account number" {...register('bankAccountNumber')} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">IFSC Code</label>
                        <input className="form-input" placeholder="SBIN0001234" style={{ textTransform: 'uppercase' }} {...register('ifscCode')} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Bank Name</label>
                        <input className="form-input" placeholder="e.g. State Bank of India" {...register('bankName')} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Branch</label>
                        <input className="form-input" placeholder="Branch name" {...register('branch')} />
                    </div>
                </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ alignSelf: 'flex-start', padding: '0.75rem 2rem' }}>
                {loading ? <><div className="loading-spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} /> Saving...</> : `💾 ${title}`}
            </button>
        </form>
    );
}
