import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLoans, updateLoan } from '../services/api';
import dayjs from 'dayjs';

const formatCurrency = (v) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

export default function CurrentLoans() {
    const [loans, setLoans] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('active');
    const [searchQ, setSearchQ] = useState('');
    const navigate = useNavigate();

    useEffect(() => { fetchLoans(); }, []);

    useEffect(() => {
        let result = loans;
        if (filter !== 'all') result = result.filter(l => l.status === filter);
        if (searchQ) {
            const q = searchQ.toLowerCase();
            result = result.filter(l =>
                l.loanId?.toLowerCase().includes(q) ||
                `${l.borrowerId?.name} ${l.borrowerId?.surname}`.toLowerCase().includes(q) ||
                (l.borrowerId?.familyGroup || '').toLowerCase().includes(q)
            );
        }
        setFiltered(result);
    }, [loans, filter, searchQ]);

    const fetchLoans = async () => {
        try {
            const res = await getLoans();
            setLoans(res.data.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const counts = {
        all: loans.length,
        active: loans.filter(l => l.status === 'active').length,
        closed: loans.filter(l => l.status === 'closed').length,
        defaulted: loans.filter(l => l.status === 'defaulted').length,
    };

    const FilterBtn = ({ value, label }) => (
        <button
            onClick={() => setFilter(value)}
            style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: '1px solid',
                borderColor: filter === value ? '#6366f1' : '#334155',
                background: filter === value ? 'rgba(99,102,241,0.2)' : 'transparent',
                color: filter === value ? '#a5b4fc' : '#94a3b8',
                fontWeight: filter === value ? 700 : 500,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
            }}
        >
            {label} ({counts[value]})
        </button>
    );

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                    <h1 className="page-title">Loans</h1>
                    <p className="page-subtitle">All loan records across the community</p>
                </div>
                <button className="btn-primary" onClick={() => navigate('/loans/create')}>＋ Create Loan</button>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                <FilterBtn value="all" label="All" />
                <FilterBtn value="active" label="🟢 Active" />
                <FilterBtn value="closed" label="⚫ Closed" />
                <FilterBtn value="defaulted" label="🔴 Defaulted" />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <input
                    className="form-input"
                    style={{ maxWidth: '400px' }}
                    placeholder="🔍 Search by loan ID, borrower name, family..."
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                />
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                    <div className="loading-spinner" style={{ width: '3rem', height: '3rem' }} />
                </div>
            ) : filtered.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ fontSize: '3rem' }}>📋</div>
                    <div style={{ color: '#94a3b8', marginTop: '1rem' }}>No loans found.</div>
                </div>
            ) : (
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Loan ID</th>
                                <th>Borrower</th>
                                <th>Total Amount</th>
                                <th>Annual Rate</th>
                                <th>Period</th>
                                <th>Disbursed</th>
                                <th>Lenders</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(loan => (
                                <tr key={loan._id}>
                                    <td>
                                        <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#a5b4fc' }}>{loan.loanId}</span>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 700 }}>{loan.borrowerId?.name} {loan.borrowerId?.surname}</div>
                                        {loan.borrowerId?.familyGroup && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{loan.borrowerId.familyGroup}</div>}
                                    </td>
                                    <td style={{ fontWeight: 700, color: '#10b981' }}>{formatCurrency(loan.totalLoanAmount)}</td>
                                    <td>{loan.interestRateAnnual}%</td>
                                    <td>{loan.interestPeriodMonths}M</td>
                                    <td style={{ fontSize: '0.85rem' }}>{dayjs(loan.disbursementDate).format('DD/MM/YYYY')}</td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                            {loan.lenders?.slice(0, 2).map((l, i) => (
                                                <span key={i} style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                    {l.lenderId?.name} {l.lenderId?.surname} ({formatCurrency(l.amountContributed)})
                                                </span>
                                            ))}
                                            {loan.lenders?.length > 2 && <span style={{ fontSize: '0.7rem', color: '#64748b' }}>+{loan.lenders.length - 2} more</span>}
                                        </div>
                                    </td>
                                    <td><span className={`badge badge-${loan.status}`}>{loan.status.toUpperCase()}</span></td>
                                    <td>
                                        <button className="btn-secondary btn-sm" onClick={() => navigate(`/loans/${loan._id}`)}>View →</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
