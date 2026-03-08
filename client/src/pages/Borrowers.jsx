import { useState, useEffect } from 'react';
import { getBorrowers, createBorrower, updateBorrower } from '../services/api';
import PersonForm from '../components/PersonForm';
import dayjs from 'dayjs';

export default function Borrowers() {
    const [borrowers, setBorrowers] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQ, setSearchQ] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        fetchBorrowers();
    }, []);

    useEffect(() => {
        if (!searchQ) { setFiltered(borrowers); return; }
        const q = searchQ.toLowerCase();
        setFiltered(borrowers.filter(b =>
            `${b.name} ${b.surname}`.toLowerCase().includes(q) ||
            (b.familyGroup || '').toLowerCase().includes(q) ||
            (b.panNumber || '').toLowerCase().includes(q)
        ));
    }, [searchQ, borrowers]);

    const fetchBorrowers = async () => {
        try {
            const res = await getBorrowers();
            setBorrowers(res.data.data);
            setFiltered(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (data) => {
        setFormLoading(true);
        try {
            if (editing) {
                const res = await updateBorrower(editing._id, data);
                setBorrowers(prev => prev.map(b => b._id === editing._id ? res.data.data : b));
                showToast('Borrower updated successfully!');
            } else {
                const res = await createBorrower(data);
                setBorrowers(prev => [res.data.data, ...prev]);
                showToast('Borrower added successfully!');
            }
            setShowModal(false);
            setEditing(null);
        } catch (err) {
            showToast(err.response?.data?.message || 'Error saving borrower', 'error');
        } finally {
            setFormLoading(false);
        }
    };

    const openEdit = (borrower) => {
        setEditing({ ...borrower, dob: borrower.dob ? dayjs(borrower.dob).format('YYYY-MM-DD') : '' });
        setShowModal(true);
    };

    return (
        <div className="fade-in">
            {/* Toast */}
            {toast && (
                <div className={`alert alert-${toast.type}`} style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 200, minWidth: '300px' }}>
                    {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
                </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                    <h1 className="page-title">Borrowers</h1>
                    <p className="page-subtitle">{borrowers.length} total borrower{borrowers.length !== 1 ? 's' : ''} registered</p>
                </div>
                <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
                    ＋ Add Borrower
                </button>
            </div>

            {/* Search */}
            <div style={{ marginBottom: '1.5rem' }}>
                <input
                    className="form-input"
                    style={{ maxWidth: '400px' }}
                    placeholder="🔍 Search by name, family group, PAN..."
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                />
            </div>

            {/* Table */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                    <div className="loading-spinner" style={{ width: '3rem', height: '3rem' }} />
                </div>
            ) : filtered.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👤</div>
                    <div style={{ color: '#94a3b8' }}>
                        {searchQ ? 'No borrowers match your search.' : 'No borrowers added yet. Add your first borrower!'}
                    </div>
                </div>
            ) : (
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Family Group</th>
                                <th>DOB</th>
                                <th>PAN</th>
                                <th>Aadhaar</th>
                                <th>Bank</th>
                                <th>Added</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(b => (
                                <tr key={b._id}>
                                    <td>
                                        <div style={{ fontWeight: 700 }}>{b.name} {b.surname}</div>
                                        {b.address && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{b.address.substring(0, 40)}{b.address.length > 40 ? '...' : ''}</div>}
                                    </td>
                                    <td>{b.familyGroup || <span style={{ color: '#475569' }}>—</span>}</td>
                                    <td>{b.dob ? dayjs(b.dob).format('DD/MM/YYYY') : '—'}</td>
                                    <td><code style={{ fontSize: '0.8rem', color: '#a5b4fc' }}>{b.panNumber || '—'}</code></td>
                                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{b.aadhaarNumber || '—'}</td>
                                    <td>
                                        {b.bankName ? (
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{b.bankName}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{b.ifscCode}</div>
                                            </div>
                                        ) : <span style={{ color: '#475569' }}>—</span>}
                                    </td>
                                    <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{dayjs(b.createdAt).format('DD/MM/YYYY')}</td>
                                    <td>
                                        <button className="btn-secondary btn-sm" onClick={() => openEdit(b)}>✏️ Edit</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="modal-content">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                                {editing ? '✏️ Edit Borrower' : '➕ Add Borrower'}
                            </h2>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                        </div>
                        <PersonForm
                            title={editing ? 'Update Borrower' : 'Add Borrower'}
                            defaultValues={editing || {}}
                            onSubmit={handleSubmit}
                            loading={formLoading}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
