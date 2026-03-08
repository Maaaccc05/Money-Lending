import { useState, useEffect } from 'react';
import { reportCurrentLoans, reportByBorrower, reportByLender, reportFamilyGroup, reportPendingInterest } from '../services/api';
import dayjs from 'dayjs';

const formatCurrency = (v) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

const REPORTS = [
    { key: 'current', label: 'Current Loans', icon: '📋', desc: 'All active loans with borrower and lender info' },
    { key: 'by-borrower', label: 'By Borrower', icon: '👤', desc: 'Loans grouped by borrower' },
    { key: 'by-lender', label: 'By Lender', icon: '💰', desc: 'Contributions grouped by lender' },
    { key: 'borrower-family', label: 'Borrower Family Groups', icon: '👨‍👩‍👧', desc: 'Loan stats by borrower family group' },
    { key: 'lender-family', label: 'Lender Family Groups', icon: '👨‍👩‍👦', desc: 'Contribution stats by lender family group' },
    { key: 'pending-interest', label: 'Pending Interest', icon: '⏳', desc: 'Outstanding interest by loan and lender' },
];

export default function Reports() {
    const [activeReport, setActiveReport] = useState(null);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const loadReport = async (key) => {
        setActiveReport(key);
        setLoading(true);
        setError('');
        setData(null);
        try {
            let res;
            switch (key) {
                case 'current': res = await reportCurrentLoans(); break;
                case 'by-borrower': res = await reportByBorrower(); break;
                case 'by-lender': res = await reportByLender(); break;
                case 'borrower-family': res = await reportFamilyGroup('borrower'); break;
                case 'lender-family': res = await reportFamilyGroup('lender'); break;
                case 'pending-interest': res = await reportPendingInterest(); break;
            }
            setData(res.data);
        } catch (err) {
            setError('Failed to load report.');
        } finally {
            setLoading(false);
        }
    };

    const renderReport = () => {
        if (loading) return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                <div className="loading-spinner" style={{ width: '3rem', height: '3rem' }} />
            </div>
        );

        if (error) return <div className="alert alert-error">{error}</div>;
        if (!data) return null;

        switch (activeReport) {
            case 'current':
                return (
                    <div>
                        <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#94a3b8' }}>
                            {data.count} active loan{data.count !== 1 ? 's' : ''} • Total: {formatCurrency(data.data.reduce((s, l) => s + l.totalLoanAmount, 0))}
                        </div>
                        <div className="table-wrapper">
                            <table>
                                <thead><tr>
                                    <th>Loan ID</th><th>Borrower</th><th>Family</th><th>Amount</th>
                                    <th>Rate</th><th>Period</th><th>Disbursed</th><th>Lenders</th>
                                </tr></thead>
                                <tbody>
                                    {data.data.map(l => (
                                        <tr key={l._id}>
                                            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#a5b4fc' }}>{l.loanId}</td>
                                            <td style={{ fontWeight: 600 }}>{l.borrowerId?.name} {l.borrowerId?.surname}</td>
                                            <td style={{ color: '#94a3b8' }}>{l.borrowerId?.familyGroup || '—'}</td>
                                            <td style={{ fontWeight: 700, color: '#10b981' }}>{formatCurrency(l.totalLoanAmount)}</td>
                                            <td>{l.interestRateAnnual}%</td>
                                            <td>{l.interestPeriodMonths}M</td>
                                            <td>{dayjs(l.disbursementDate).format('DD/MM/YYYY')}</td>
                                            <td>{l.lenders?.length}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );

            case 'by-borrower':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {data.data.map((group, idx) => (
                            <div key={idx} className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{group.borrower.name} {group.borrower.surname}</div>
                                        {group.borrower.familyGroup && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{group.borrower.familyGroup}</div>}
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#10b981' }}>{formatCurrency(group.totalAmount)}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{group.loans.length} loan{group.loans.length !== 1 ? 's' : ''} • {group.activeLoans} active</div>
                                    </div>
                                </div>
                                <div className="table-wrapper">
                                    <table>
                                        <thead><tr><th>Loan ID</th><th>Amount</th><th>Rate</th><th>Disbursed</th><th>Status</th></tr></thead>
                                        <tbody>
                                            {group.loans.map(l => (
                                                <tr key={l._id}>
                                                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#a5b4fc' }}>{l.loanId}</td>
                                                    <td style={{ fontWeight: 600 }}>{formatCurrency(l.totalLoanAmount)}</td>
                                                    <td>{l.interestRateAnnual}%</td>
                                                    <td>{dayjs(l.disbursementDate).format('DD/MM/YYYY')}</td>
                                                    <td><span className={`badge badge-${l.status}`}>{l.status}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                );

            case 'by-lender':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {data.data.map((group, idx) => (
                            <div key={idx} className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{group.lender.name} {group.lender.surname}</div>
                                        {group.lender.familyGroup && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{group.lender.familyGroup}</div>}
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#10b981' }}>{formatCurrency(group.totalContributed)}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Total contributed</div>
                                    </div>
                                </div>
                                <div className="table-wrapper">
                                    <table>
                                        <thead><tr><th>Loan ID</th><th>Borrower</th><th>Contributed</th><th>Rate</th><th>Disbursed</th><th>Status</th></tr></thead>
                                        <tbody>
                                            {group.contributions.map((c, i) => (
                                                <tr key={i}>
                                                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#a5b4fc' }}>{c.loanId}</td>
                                                    <td style={{ fontWeight: 600 }}>{c.borrower?.name} {c.borrower?.surname}</td>
                                                    <td style={{ fontWeight: 600, color: '#10b981' }}>{formatCurrency(c.amountContributed)}</td>
                                                    <td>{c.lenderInterestRate}%</td>
                                                    <td>{dayjs(c.disbursementDate).format('DD/MM/YYYY')}</td>
                                                    <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                );

            case 'borrower-family':
            case 'lender-family':
                return (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Family Group</th>
                                    <th>{activeReport === 'lender-family' ? 'Lenders' : 'Total Amount'}</th>
                                    <th>{activeReport === 'lender-family' ? 'Total Contributed' : 'Loan Count'}</th>
                                    <th>{activeReport === 'lender-family' ? '' : 'Active Loans'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.data.map((row, idx) => (
                                    <tr key={idx}>
                                        <td style={{ fontWeight: 700 }}>{row.familyGroup || 'Ungrouped'}</td>
                                        {activeReport === 'lender-family' ? (
                                            <>
                                                <td>{row.lenderCount}</td>
                                                <td style={{ fontWeight: 700, color: '#10b981' }}>{formatCurrency(row.totalContributed)}</td>
                                            </>
                                        ) : (
                                            <>
                                                <td style={{ fontWeight: 700, color: '#10b981' }}>{formatCurrency(row.totalAmount)}</td>
                                                <td>{row.loanCount}</td>
                                                <td><span className="badge badge-active">{row.activeLoans}</span></td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );

            case 'pending-interest':
                return (
                    <div>
                        <div style={{ marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                                <div><span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Total Pending: </span><strong style={{ color: '#f59e0b', fontSize: '1.1rem' }}>{formatCurrency(data.totalPending)}</strong></div>
                                <div><span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Records: </span><strong>{data.count}</strong></div>
                            </div>
                        </div>
                        <div className="table-wrapper">
                            <table>
                                <thead><tr>
                                    <th>Loan ID</th><th>Borrower</th><th>Lender</th>
                                    <th>Period</th><th>Days</th><th>Rate</th><th>Interest</th>
                                </tr></thead>
                                <tbody>
                                    {data.data.map(r => (
                                        <tr key={r._id}>
                                            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#a5b4fc' }}>{r.loanId?.loanId}</td>
                                            <td style={{ fontWeight: 600 }}>{r.loanId?.borrowerId?.name} {r.loanId?.borrowerId?.surname}</td>
                                            <td style={{ fontWeight: 600 }}>{r.lenderId?.name} {r.lenderId?.surname}</td>
                                            <td style={{ fontSize: '0.8rem' }}>{dayjs(r.startDate).format('DD/MM/YY')} – {dayjs(r.endDate).format('DD/MM/YY')}</td>
                                            <td>{r.daysCount}</td>
                                            <td>{r.interestRate}%</td>
                                            <td style={{ fontWeight: 800, color: '#f59e0b' }}>{formatCurrency(r.interestAmount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );

            default: return null;
        }
    };

    return (
        <div className="fade-in">
            <div style={{ marginBottom: '2rem' }}>
                <h1 className="page-title">Reports</h1>
                <p className="page-subtitle">Generate and view detailed lending reports</p>
            </div>

            {/* Report Selector */}
            <div className="grid-3" style={{ marginBottom: '2rem' }}>
                {REPORTS.map(r => (
                    <button
                        key={r.key}
                        onClick={() => loadReport(r.key)}
                        style={{
                            background: activeReport === r.key ? 'rgba(99,102,241,0.15)' : 'rgba(30,41,59,0.8)',
                            border: `1px solid ${activeReport === r.key ? '#6366f1' : '#334155'}`,
                            borderRadius: '0.75rem',
                            padding: '1.25rem',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem',
                            width: '100%',
                        }}
                        onMouseOver={e => { if (activeReport !== r.key) e.currentTarget.style.borderColor = '#6366f1'; }}
                        onMouseOut={e => { if (activeReport !== r.key) e.currentTarget.style.borderColor = '#334155'; }}
                    >
                        <div style={{ fontSize: '1.5rem' }}>{r.icon}</div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: activeReport === r.key ? '#a5b4fc' : '#f1f5f9' }}>{r.label}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{r.desc}</div>
                    </button>
                ))}
            </div>

            {/* Report Output */}
            {activeReport && (
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                            {REPORTS.find(r => r.key === activeReport)?.icon} {REPORTS.find(r => r.key === activeReport)?.label}
                        </h2>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Generated at {dayjs().format('DD/MM/YYYY HH:mm')}</span>
                    </div>
                    {renderReport()}
                </div>
            )}

            {!activeReport && (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📈</div>
                    <div style={{ color: '#94a3b8' }}>Select a report above to generate it</div>
                </div>
            )}
        </div>
    );
}
