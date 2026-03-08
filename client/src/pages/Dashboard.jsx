import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLoans } from '../services/api';
import { reportPendingInterest } from '../services/api';
import dayjs from 'dayjs';

const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);

const StatCard = ({ label, value, icon, color, sublabel }) => (
    <div className="stat-card" style={{ '--accent-color': color }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${color}, transparent)`, borderRadius: '1rem 1rem 0 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f1f5f9', marginTop: '0.375rem' }}>{value}</div>
                {sublabel && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>{sublabel}</div>}
            </div>
            <div style={{ fontSize: '2rem', opacity: 0.8 }}>{icon}</div>
        </div>
    </div>
);

const QuickAction = ({ label, icon, path, color, desc }) => {
    const navigate = useNavigate();
    return (
        <button
            onClick={() => navigate(path)}
            style={{
                background: 'rgba(30,41,59,0.8)',
                border: `1px solid ${color}30`,
                borderRadius: '1rem',
                padding: '1.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                width: '100%',
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = `${color}10`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = `${color}30`; e.currentTarget.style.background = 'rgba(30,41,59,0.8)'; e.currentTarget.style.transform = 'none'; }}
        >
            <div style={{ fontSize: '2rem' }}>{icon}</div>
            <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f1f5f9' }}>{label}</div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>{desc}</div>
            </div>
        </button>
    );
};

export default function Dashboard() {
    const [loans, setLoans] = useState([]);
    const [pendingInterest, setPendingInterest] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [loansRes, pendingRes] = await Promise.all([
                    getLoans(),
                    reportPendingInterest(),
                ]);
                setLoans(loansRes.data.data || []);
                setPendingInterest(pendingRes.data.data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const activeLoans = loans.filter(l => l.status === 'active');
    const closedLoans = loans.filter(l => l.status === 'closed');
    const totalActiveAmount = activeLoans.reduce((sum, l) => sum + l.totalLoanAmount, 0);
    const totalPendingInterest = pendingInterest.reduce((sum, r) => sum + r.interestAmount, 0);

    const recentLoans = [...activeLoans].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

    return (
        <div className="fade-in">
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Community Lending Overview — {dayjs().format('dddd, DD MMMM YYYY')}</p>
            </div>

            {/* Stats */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                    <div className="loading-spinner" style={{ width: '3rem', height: '3rem' }} />
                </div>
            ) : (
                <>
                    <div className="grid-4" style={{ marginBottom: '2rem' }}>
                        <StatCard label="Active Loans" value={activeLoans.length} icon="📋" color="#6366f1" sublabel={`${closedLoans.length} closed`} />
                        <StatCard label="Total Active Portfolio" value={formatCurrency(totalActiveAmount)} icon="💼" color="#10b981" sublabel="Across all borrowers" />
                        <StatCard label="Pending Interest" value={formatCurrency(totalPendingInterest)} icon="⏳" color="#f59e0b" sublabel={`${pendingInterest.length} records`} />
                        <StatCard label="Total Loans" value={loans.length} icon="📊" color="#0ea5e9" sublabel="All time" />
                    </div>

                    {/* Quick Actions */}
                    <div style={{ marginBottom: '2rem' }}>
                        <h2 className="section-title">Quick Actions</h2>
                        <div className="grid-3">
                            <QuickAction label="Create New Loan" icon="➕" path="/loans/create" color="#6366f1" desc="Set up a new loan between borrower and lenders" />
                            <QuickAction label="View Current Loans" icon="📋" path="/loans" color="#10b981" desc="Browse and manage all active loans" />
                            <QuickAction label="Record Interest" icon="💸" path="/interest" color="#f59e0b" desc="Mark interest payments as received" />
                            <QuickAction label="Manage Borrowers" icon="👤" path="/borrowers" color="#0ea5e9" desc="Add, edit, and search borrowers" />
                            <QuickAction label="Manage Lenders" icon="💰" path="/lenders" color="#8b5cf6" desc="Add, edit, and search lenders" />
                            <QuickAction label="View Reports" icon="📈" path="/reports" color="#ef4444" desc="Generate detailed loan and interest reports" />
                        </div>
                    </div>

                    {/* Recent Active Loans */}
                    <div className="card">
                        <h2 className="section-title">Recent Active Loans</h2>
                        {recentLoans.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                                No active loans yet. <a href="/loans/create" style={{ color: '#6366f1' }}>Create one →</a>
                            </div>
                        ) : (
                            <div className="table-wrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Loan ID</th>
                                            <th>Borrower</th>
                                            <th>Amount</th>
                                            <th>Rate</th>
                                            <th>Period</th>
                                            <th>Disbursed</th>
                                            <th>Lenders</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentLoans.map(loan => (
                                            <tr key={loan._id} style={{ cursor: 'pointer' }} onClick={() => window.location.href = `/loans/${loan._id}`}>
                                                <td>
                                                    <span style={{ fontWeight: 700, color: '#6366f1', fontFamily: 'monospace' }}>{loan.loanId}</span>
                                                </td>
                                                <td style={{ fontWeight: 600 }}>
                                                    {loan.borrowerId?.name} {loan.borrowerId?.surname}
                                                    {loan.borrowerId?.familyGroup && (
                                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{loan.borrowerId.familyGroup}</div>
                                                    )}
                                                </td>
                                                <td style={{ fontWeight: 700, color: '#10b981' }}>{formatCurrency(loan.totalLoanAmount)}</td>
                                                <td>{loan.interestRateAnnual}%</td>
                                                <td>{loan.interestPeriodMonths}M</td>
                                                <td>{dayjs(loan.disbursementDate).format('DD/MM/YYYY')}</td>
                                                <td>
                                                    <span className="badge badge-active">{loan.lenders?.length || 0} lender{loan.lenders?.length !== 1 ? 's' : ''}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
