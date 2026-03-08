import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register, handleSubmit, formState: { errors } } = useForm();

    const onSubmit = async (data) => {
        setError('');
        setLoading(true);
        try {
            await login(data.username, data.password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Background orbs */}
            <div style={{
                position: 'absolute', top: '-20%', left: '-10%',
                width: '500px', height: '500px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute', bottom: '-20%', right: '-10%',
                width: '600px', height: '600px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            <div className="fade-in" style={{
                width: '100%',
                maxWidth: '420px',
                background: 'rgba(30,41,59,0.9)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: '1.5rem',
                padding: '2.5rem',
                boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: '64px', height: '64px',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        borderRadius: '16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.75rem', margin: '0 auto 1rem',
                        boxShadow: '0 8px 25px rgba(99,102,241,0.4)',
                    }}>₹</div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f1f5f9', marginBottom: '0.25rem' }}>
                        MoneyLender
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                        Community Lending Management System
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {error && (
                        <div className="alert alert-error">{error}</div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Username</label>
                        <input
                            className="form-input"
                            type="text"
                            placeholder="Enter username"
                            autoComplete="username"
                            {...register('username', { required: 'Username is required' })}
                        />
                        {errors.username && <span className="form-error">{errors.username.message}</span>}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            className="form-input"
                            type="password"
                            placeholder="Enter password"
                            autoComplete="current-password"
                            {...register('password', { required: 'Password is required' })}
                        />
                        {errors.password && <span className="form-error">{errors.password.message}</span>}
                    </div>

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                        style={{ width: '100%', justifyContent: 'center', padding: '0.875rem', fontSize: '1rem', marginTop: '0.5rem' }}
                    >
                        {loading ? (
                            <><div className="loading-spinner" style={{ width: '1.2rem', height: '1.2rem', borderWidth: '2px' }} /> Signing in...</>
                        ) : (
                            '🔐 Sign In'
                        )}
                    </button>
                </form>

                <div style={{
                    marginTop: '1.5rem',
                    padding: '0.875rem',
                    background: 'rgba(99,102,241,0.08)',
                    border: '1px solid rgba(99,102,241,0.15)',
                    borderRadius: '0.5rem',
                }}>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>
                        🔒 Restricted Access — Control Panel Only
                    </p>
                </div>
            </div>
        </div>
    );
}
