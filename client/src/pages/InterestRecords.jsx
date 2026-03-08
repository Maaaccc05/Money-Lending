import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPendingInterest, receiveInterestPayment } from '../services/api';
import dayjs from 'dayjs';

const formatCurrency = (v) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(v || 0);

export default function InterestRecords() {
    const navigate = useNavigate();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [payModal, setPayModal] = useState(null);
    const [payDate, setPayDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [payLoading, setPayLoading] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => { fetchPending(); }, []);

    const fetchPending = async () => {
        try {
            const res = await getPendingInterest();
            setRecords(res.data.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkPaid = async () => {
        if (!payModal) return;
        setPayLoading(true);
        try {
            await receiveInterestPayment({
                interestRecordId: payModal._id,
                amountPaid: payModal.interestAmount,
                paymentDate: payDate,
            });
            showToast('Interest payment recorded!');
            setPayModal(null);
            await fetchPending();
        } catch {
            showToast('Failed to record payment', 'error');
        } finally {
            setPayLoading(false);
        }
    };

    const totalPending = records.reduce((sum, r) => sum + r.interestAmount, 0);

    // Group by overdue (end date < today)
    const today = dayjs();
    const overdue = records.filter(r => dayjs(r.endDate).isBefore(today, 'day'));
    const current = records.filter(r => !dayjs(r.endDate).isBefore(today, 'day'));

    return (
        <div className="fade-in">
            {toast && (
                <div className={`alert alert-${toast.type}`} style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 200, minWidth: '300px' }}>
                    {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
                </div>
            )}

            <div style={{ marginBottom: '2rem' }}>
                <h1 className="page-title">Interest Records</h1>
                <p className="page-subtitle">All pending interest payments across active loans</p>
            </div>

            {/* Summary */}
            <div className="grid-3" style={{ marginBottom: '2rem' }}>
                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Total Pending</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.25rem' }}>{formatCurrency(totalPending)}</div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Overdue Records</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ef4444', marginTop: '0.25rem' }}>{overdue.length}</div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Current Records</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>{current.length}</div>
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                    <div className="loading-spinner" style={{ width: '3rem', height: '3rem' }} />
                </div>
            ) : records.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ fontSize: '3rem' }}>🎉</div>
                    <div style={{ color: '#10b981', fontWeight: 700, marginTop: '1rem' }}>All interest payments are cleared!</div>
                </div>
            ) : (
                <>
                    {overdue.length > 0 && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ef4444', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                ⚠️ Overdue ({overdue.length})
                            </div>
                            <div className="table-wrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Loan ID</th>
                                            <th>Lender</th>
                                            <th>Period</th>
                                            <th>Principal</th>
                                            <th>Rate</th>
                                            <th>Days</th>
                                            <th>Interest Due</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {overdue.map(r => (
                                            <tr key={r._id} style={{ background: 'rgba(239,68,68,0.04)' }}>
                                                <td
                                                    style={{ fontWeight: 700, fontFamily: 'monospace', color: '#a5b4fc', cursor: 'pointer' }}
                                                    onClick={() => navigate(`/loans/${r.loanId?._id}`)}
                                                >
                                                    {r.loanId?.loanId}
                                                </td>
                                                <td style={{ fontWeight: 600 }}>{r.lenderId?.name} {r.lenderId?.surname}</td>
                                                <td style={{ fontSize: '0.8rem' }}>
                                                    {dayjs(r.startDate).format('DD/MM/YY')} – {dayjs(r.endDate).format('DD/MM/YY')}
                                                </td>
                                                <td>{formatCurrency(r.principalAmount)}</td>
                                                <td>{r.interestRate}%</td>
                                                <td>{r.daysCount}</td>
                                                <td style={{ fontWeight: 800, color: '#ef4444' }}>{formatCurrency(r.interestAmount)}</td>
                                                <td>
                                                    <button className="btn-success btn-sm" onClick={() => setPayModal(r)}>💳 Mark Paid</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {current.length > 0 && (
                        <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                📋 Pending ({current.length})
                            </div>
                            <div className="table-wrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Loan ID</th>
                                            <th>Lender</th>
                                            <th>Period</th>
                                            <th>Principal</th>
                                            <th>Rate</th>
                                            <th>Days</th>
                                            <th>Interest Due</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {current.map(r => (
                                            <tr key={r._id}>
                                                <td
                                                    style={{ fontWeight: 700, fontFamily: 'monospace', color: '#a5b4fc', cursor: 'pointer' }}
                                                    onClick={() => navigate(`/loans/${r.loanId?._id}`)}
                                                >
                                                    {r.loanId?.loanId}
                                                </td>
                                                <td style={{ fontWeight: 600 }}>{r.lenderId?.name} {r.lenderId?.surname}</td>
                                                <td style={{ fontSize: '0.8rem' }}>
                                                    {dayjs(r.startDate).format('DD/MM/YY')} – {dayjs(r.endDate).format('DD/MM/YY')}
                                                </td>
                                                <td>{formatCurrency(r.principalAmount)}</td>
                                                <td>{r.interestRate}%</td>
                                                <td>{r.daysCount}</td>
                                                <td style={{ fontWeight: 800, color: '#f59e0b' }}>{formatCurrency(r.interestAmount)}</td>
                                                <td>
                                                    <button className="btn-success btn-sm" onClick={() => setPayModal(r)}>💳 Mark Paid</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Pay Modal */}
            {payModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '450px' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.5rem' }}>💳 Record Interest Payment</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.75rem' }}>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Loan</div>
                                <div style={{ fontWeight: 700, fontFamily: 'monospace', color: '#a5b4fc' }}>{payModal.loanId?.loanId}</div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>Lender</div>
                                <div style={{ fontWeight: 700 }}>{payModal.lenderId?.name} {payModal.lenderId?.surname}</div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>Period</div>
                                <div style={{ fontSize: '0.85rem' }}>
                                    {dayjs(payModal.startDate).format('DD/MM/YYYY')} – {dayjs(payModal.endDate).format('DD/MM/YYYY')}
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.75rem' }}>{formatCurrency(payModal.interestAmount)}</div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Payment Date</label>
                                <input className="form-input" type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button className="btn-success" onClick={handleMarkPaid} disabled={payLoading} style={{ flex: 1, justifyContent: 'center' }}>
                                    {payLoading ? 'Recording...' : '✓ Confirm Payment'}
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
