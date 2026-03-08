import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
    { path: '/', label: 'Dashboard', icon: '⊞', exact: true },
    { path: '/loans/create', label: 'Create Loan', icon: '＋' },
    { path: '/loans', label: 'Current Loans', icon: '📋' },
    { path: '/borrowers', label: 'Borrowers', icon: '👤' },
    { path: '/lenders', label: 'Lenders', icon: '💰' },
    { path: '/interest', label: 'Interest Records', icon: '📊' },
    { path: '/reports', label: 'Reports', icon: '📈' },
];

export default function Navbar() {
    const { logout, user } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav style={{
            width: '260px',
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)',
            borderRight: '1px solid rgba(99,102,241,0.2)',
            display: 'flex',
            flexDirection: 'column',
            position: 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            zIndex: 50,
        }}>
            {/* Logo */}
            <div style={{ padding: '1.75rem 1.5rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '10px',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.2rem', flexShrink: 0,
                    }}>₹</div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#f1f5f9', lineHeight: 1.2 }}>MoneyLender</div>
                        <div style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Control Panel</div>
                    </div>
                </div>
            </div>

            {/* Nav Links */}
            <div style={{ flex: 1, padding: '1rem 0.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {navItems.map(({ path, label, icon, exact }) => (
                    <NavLink
                        key={path}
                        to={path}
                        end={exact}
                        style={({ isActive }) => ({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.75rem 1rem',
                            borderRadius: '0.6rem',
                            textDecoration: 'none',
                            fontSize: '0.875rem',
                            fontWeight: isActive ? 700 : 500,
                            color: isActive ? '#ffffff' : '#94a3b8',
                            background: isActive ? 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.2))' : 'transparent',
                            border: isActive ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
                            transition: 'all 0.2s ease',
                        })}
                    >
                        <span style={{ fontSize: '1.1rem', width: '1.5rem', textAlign: 'center' }}>{icon}</span>
                        {label}
                    </NavLink>
                ))}
            </div>

            {/* User + Logout */}
            <div style={{ padding: '1rem 0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{
                    background: 'rgba(99,102,241,0.1)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: '0.75rem',
                    padding: '0.875rem',
                    marginBottom: '0.75rem',
                }}>
                    <div style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Logged in as</div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f1f5f9', marginTop: '0.125rem', textTransform: 'capitalize' }}>
                        {user?.username || 'Control'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.125rem' }}>Administrator • Control</div>
                </div>
                <button
                    onClick={handleLogout}
                    style={{
                        width: '100%',
                        padding: '0.625rem',
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '0.6rem',
                        color: '#f87171',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                    onMouseOut={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                >
                    ⏻ Logout
                </button>
            </div>
        </nav>
    );
}
