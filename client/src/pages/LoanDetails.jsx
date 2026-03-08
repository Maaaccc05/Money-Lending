import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLoan, updateLoan, generateInterest, getInterestByLoan, getPaymentsByLoan, receiveInterestPayment, searchLenders, addLenderToLoan } from '../services/api';
import dayjs from 'dayjs';

const formatCurrency = (v) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(v || 0);

export default function LoanDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loan, setLoan] = useState(null);
    const [interestRecords, setInterestRecords] = useState([]);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('details');
    const [toast, setToast] = useState(null);
    const [genLoading, setGenLoading] = useState(false);
    const [payModal, setPayModal] = useState(null);
    const [payLoading, setPayLoading] = useState(false);
    const [paymentDate, setPaymentDate] = useState(dayjs().format('YYYY-MM-DD'));

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    useEffect(() => { fetchAll(); }, [id]);

    const fetchAll = async () => {
        try {
            const [loanRes, interestRes, paymentsRes] = await Promise.all([
                getLoan(id),
                getInterestByLoan(id),
                getPaymentsByLoan(id),
            ]);
            setLoan(loanRes.data.data);
            setInterestRecords(interestRes.data.data);
            setPayments(paymentsRes.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateInterest = async () => {
        setGenLoading(true);
        try {
            const res = await generateInterest(id, {});
            showToast(res.data.message || 'Interest records generated!');
            const ir = await getInterestByLoan(id);
            setInterestRecords(ir.data.data);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to generate interest', 'error');
        } finally {
            setGenLoading(false);
        }
    };

    const handleMarkPaid = async () => {
        if (!payModal) return;
        setPayLoading(true);
        try {
            await receiveInterestPayment({
                interestRecordId: payModal._id,
                amountPaid: payModal.interestAmount,
                paymentDate,
            });
            showToast('Interest payment recorded!');
            setPayModal(null);
            await fetchAll();
        } catch (err) {
            showToast('Failed to record payment', 'error');
        } finally {
            setPayLoading(false);
        }
    };

    const handleStatusChange = async (status) => {
        try {
            const res = await updateLoan(id, { status });
            setLoan(res.data.data);
            showToast(`Loan marked as ${status}`);
        } catch {
            showToast('Failed to update status', 'error');
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
            <div className="loading-spinner" style={{ width: '4rem', height: '4rem' }} />
        </div>
    );

    if (!loan) return (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '3rem' }}>🔍</div>
            <div style={{ color: '#94a3b8', marginTop: '1rem' }}>Loan not found.</div>
        </div>
    );

    const totalContributed = loan.lenders.reduce((sum, l) => sum + l.amountContributed, 0);
    const pendingRecords = interestRecords.filter(r => r.status === 'pending');
    const paidRecords = interestRecords.filter(r => r.status === 'paid');
    const totalPending = pendingRecords.reduce((sum, r) => sum + r.interestAmount, 0);
    const totalPaid = paidRecords.reduce((sum, r) => sum + r.interestAmount, 0);

    const statusColor = { active: '#10b981', closed: '#94a3b8', defaulted: '#ef4444' };

    return (
        <div className="fade-in">
            {toast && (
                <div className={`alert alert-${toast.type}`} style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 200, minWidth: '300px' }}>
                    {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
                </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                        <h1 className="page-title">{loan.loanId}</h1>
                        <span className={`badge badge-${loan.status}`}>{loan.status.toUpperCase()}</span>
                    </div>
                    <p className="page-subtitle">
                        Borrower: <strong>{loan.borrowerId?.name} {loan.borrowerId?.surname}</strong>
                        {loan.borrowerId?.familyGroup && ` • ${loan.borrowerId.familyGroup}`}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button className="btn-secondary btn-sm" onClick={() => navigate(-1)}>← Back</button>
                    {loan.status === 'active' && (
                        <>
                            <button className="btn-secondary btn-sm" onClick={() => handleStatusChange('closed')}>🔒 Close Loan</button>
                            <button className="btn-danger btn-sm" onClick={() => handleStatusChange('defaulted')}>⚠ Mark Default</button>
                        </>
                    )}
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid-4" style={{ marginBottom: '2rem' }}>
                <div style={{ background: '#1e293b', borderRadius: '1rem', padding: '1.25rem', border: '1px solid #334155' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Total Amount</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9', marginTop: '0.25rem' }}>{formatCurrency(loan.totalLoanAmount)}</div>
                </div>
                <div style={{ background: '#1e293b', borderRadius: '1rem', padding: '1.25rem', border: '1px solid #334155' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Rate / Period</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9', marginTop: '0.25rem' }}>{loan.interestRateAnnual}%</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{loan.interestPeriodMonths}-month cycle</div>
                </div>
                <div style={{ background: '#1e293b', borderRadius: '1rem', padding: '1.25rem', border: '1px solid #334155' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Pending Interest</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.25rem' }}>{formatCurrency(totalPending)}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{pendingRecords.length} records</div>
                </div>
                <div style={{ background: '#1e293b', borderRadius: '1rem', padding: '1.25rem', border: '1px solid #334155' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Total Paid</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>{formatCurrency(totalPaid)}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{paidRecords.length} payments</div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #334155', paddingBottom: '0' }}>
                {[['details', '📋 Details'], ['interest', `📊 Interest (${interestRecords.length})`], ['payments', `💳 Payments (${payments.length})`]].map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        style={{
                            padding: '0.625rem 1.25rem',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === key ? '2px solid #6366f1' : '2px solid transparent',
                            color: activeTab === key ? '#f1f5f9' : '#94a3b8',
                            fontWeight: activeTab === key ? 700 : 500,
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            transition: 'all 0.2s',
                            marginBottom: '-1px',
                        }}
                    >{label}</button>
                ))}
            </div>

            {/* Details Tab */}
            {activeTab === 'details' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="card">
                        <h3 className="section-title">Borrower Details</h3>
                        <div className="grid-2">
                            {[
                                ['Name', `${loan.borrowerId?.name} ${loan.borrowerId?.surname}`],
                                ['Family Group', loan.borrowerId?.familyGroup || '—'],
                                ['PAN', loan.borrowerId?.panNumber || '—'],
                                ['Aadhaar', loan.borrowerId?.aadhaarNumber || '—'],
                                ['Bank', loan.borrowerId?.bankName || '—'],
                                ['IFSC', loan.borrowerId?.ifscCode || '—'],
                            ].map(([label, value]) => (
                                <div key={label}>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{label}</div>
                                    <div style={{ fontWeight: 600, marginTop: '0.125rem' }}>{value}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 className="section-title" style={{ marginBottom: 0 }}>Loan Disbursement</h3>
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Disbursed: {dayjs(loan.disbursementDate).format('DD/MM/YYYY')}</span>
                        </div>
                        <div className="grid-2">
                            {[
                                ['Total Loan Amount', formatCurrency(loan.totalLoanAmount)],
                                ['Annual Interest Rate', `${loan.interestRateAnnual}%`],
                                ['Interest Period', `${loan.interestPeriodMonths} Month(s)`],
                                ['Status', loan.status.toUpperCase()],
                            ].map(([label, value]) => (
                                <div key={label}>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{label}</div>
                                    <div style={{ fontWeight: 700, marginTop: '0.125rem', color: label === 'Status' ? statusColor[loan.status] : '#f1f5f9' }}>{value}</div>
                                </div>
                            ))}
                        </div>
                        {loan.notes && <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>📝 {loan.notes}</div>}
                    </div>

                    <div className="card">
                        <h3 className="section-title">Lender Contributions</h3>
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Lender</th>
                                        <th>Amount</th>
                                        <th>Share %</th>
                                        <th>Interest Rate</th>
                                        <th>Money Received</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loan.lenders.map((entry, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <div style={{ fontWeight: 700 }}>{entry.lenderId?.name} {entry.lenderId?.surname}</div>
                                                {entry.lenderId?.familyGroup && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{entry.lenderId.familyGroup}</div>}
                                            </td>
                                            <td style={{ fontWeight: 700, color: '#10b981' }}>{formatCurrency(entry.amountContributed)}</td>
                                            <td><span style={{ color: '#a5b4fc' }}>{totalContributed > 0 ? ((entry.amountContributed / totalContributed) * 100).toFixed(1) : 0}%</span></td>
                                            <td>{entry.lenderInterestRate}%</td>
                                            <td>{dayjs(entry.moneyReceivedDate).format('DD/MM/YYYY')}</td>
                                        </tr>
                                    ))}
                                    <tr style={{ background: 'rgba(99,102,241,0.08)' }}>
                                        <td style={{ fontWeight: 800 }}>TOTAL</td>
                                        <td style={{ fontWeight: 800, color: '#6366f1' }}>{formatCurrency(totalContributed)}</td>
                                        <td style={{ fontWeight: 800 }}>100%</td>
                                        <td colSpan={2} />
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Interest Tab */}
            {activeTab === 'interest' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                        {loan.status === 'active' && (
                            <button className="btn-primary" onClick={handleGenerateInterest} disabled={genLoading}>
                                {genLoading ? <><div className="loading-spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} /> Generating...</> : '⚡ Generate Next Interest Cycle'}
                            </button>
                        )}
                    </div>
                    {interestRecords.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                            <div style={{ fontSize: '3rem' }}>📊</div>
                            <div style={{ color: '#94a3b8', marginTop: '1rem' }}>No interest records yet.<br />Click "Generate Next Interest Cycle" to create them.</div>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Lender</th>
                                        <th>Period</th>
                                        <th>Principal</th>
                                        <th>Rate</th>
                                        <th>Days</th>
                                        <th>Interest</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {interestRecords.map(record => (
                                        <tr key={record._id}>
                                            <td style={{ fontWeight: 600 }}>{record.lenderId?.name} {record.lenderId?.surname}</td>
                                            <td style={{ fontSize: '0.8rem' }}>
                                                {dayjs(record.startDate).format('DD/MM/YY')} – {dayjs(record.endDate).format('DD/MM/YY')}
                                            </td>
                                            <td>{formatCurrency(record.principalAmount)}</td>
                                            <td>{record.interestRate}%</td>
                                            <td>{record.daysCount}</td>
                                            <td style={{ fontWeight: 700, color: '#f59e0b' }}>{formatCurrency(record.interestAmount)}</td>
                                            <td><span className={`badge badge-${record.status}`}>{record.status}</span></td>
                                            <td>
                                                {record.status === 'pending' ? (
                                                    <button className="btn-success btn-sm" onClick={() => setPayModal(record)}>💳 Mark Paid</button>
                                                ) : (
                                                    <span style={{ color: '#10b981', fontSize: '0.8rem' }}>✅ Paid</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
                <div>
                    {payments.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                            <div style={{ fontSize: '3rem' }}>💳</div>
                            <div style={{ color: '#94a3b8', marginTop: '1rem' }}>No payments recorded yet.</div>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Lender</th>
                                        <th>Period</th>
                                        <th>Amount Paid</th>
                                        <th>Payment Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payments.map(p => (
                                        <tr key={p._id}>
                                            <td style={{ fontWeight: 600 }}>{p.lenderId?.name} {p.lenderId?.surname}</td>
                                            <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{p.interestRecordId?.periodLabel || '—'}</td>
                                            <td style={{ fontWeight: 700, color: '#10b981' }}>{formatCurrency(p.amountPaid)}</td>
                                            <td>{dayjs(p.paymentDate).format('DD/MM/YYYY')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Pay Modal */}
            {payModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '450px' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.5rem' }}>💳 Record Interest Payment</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.75rem' }}>
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Lender</div>
                                <div style={{ fontWeight: 700 }}>{payModal.lenderId?.name} {payModal.lenderId?.surname}</div>
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>Period: {payModal.periodLabel}</div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.5rem' }}>{formatCurrency(payModal.interestAmount)}</div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Payment Date</label>
                                <input className="form-input" type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button className="btn-success" onClick={handleMarkPaid} disabled={payLoading} style={{ flex: 1, justifyContent: 'center' }}>
                                    {payLoading ? 'Saving...' : '✓ Confirm Payment'}
                                </button>
                                <button className="btn-secondary" onClick={() => setPayModal(null)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
