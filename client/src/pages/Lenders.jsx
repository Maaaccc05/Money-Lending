import { useState, useEffect } from 'react';
import { getLenders, createLender, updateLender } from '../services/api';
import PersonForm from '../components/PersonForm';
import dayjs from 'dayjs';

export default function Lenders() {
    const [lenders, setLenders] = useState([]);
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

    useEffect(() => { fetchLenders(); }, []);

    useEffect(() => {
        if (!searchQ) { setFiltered(lenders); return; }
        const q = searchQ.toLowerCase();
        setFiltered(lenders.filter(l =>
            `${l.name} ${l.surname}`.toLowerCase().includes(q) ||
            (l.familyGroup || '').toLowerCase().includes(q) ||
            (l.panNumber || '').toLowerCase().includes(q)
        ));
    }, [searchQ, lenders]);

    const fetchLenders = async () => {
        try {
            const res = await getLenders();
            setLenders(res.data.data);
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
                const res = await updateLender(editing._id, data);
                setLenders(prev => prev.map(l => l._id === editing._id ? res.data.data : l));
                showToast('Lender updated successfully!');
            } else {
                const res = await createLender(data);
                setLenders(prev => [res.data.data, ...prev]);
                showToast('Lender added successfully!');
            }
            setShowModal(false);
            setEditing(null);
        } catch (err) {
            showToast(err.response?.data?.message || 'Error saving lender', 'error');
        } finally {
            setFormLoading(false);
        }
    };

    const openEdit = (lender) => {
        setEditing({ ...lender, dob: lender.dob ? dayjs(lender.dob).format('YYYY-MM-DD') : '' });
        setShowModal(true);
    };

    return (
        <div className="fade-in">
            {toast && (
                <div className={`alert alert-${toast.type}`} style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 200, minWidth: '300px' }}>
                    {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                    <h1 className="page-title">Lenders</h1>
                    <p className="page-subtitle">{lenders.length} total lender{lenders.length !== 1 ? 's' : ''} registered</p>
                </div>
                <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
                    ＋ Add Lender
                </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <input
                    className="form-input"
                    style={{ maxWidth: '400px' }}
                    placeholder="🔍 Search by name, family group, PAN..."
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
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💰</div>
                    <div style={{ color: '#94a3b8' }}>
                        {searchQ ? 'No lenders match your search.' : 'No lenders added yet. Add your first lender!'}
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
                            {filtered.map(l => (
                                <tr key={l._id}>
                                    <td>
                                        <div style={{ fontWeight: 700 }}>{l.name} {l.surname}</div>
                                        {l.address && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{l.address.substring(0, 40)}{l.address.length > 40 ? '...' : ''}</div>}
                                    </td>
                                    <td>{l.familyGroup || <span style={{ color: '#475569' }}>—</span>}</td>
                                    <td>{l.dob ? dayjs(l.dob).format('DD/MM/YYYY') : '—'}</td>
                                    <td><code style={{ fontSize: '0.8rem', color: '#a5b4fc' }}>{l.panNumber || '—'}</code></td>
                                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{l.aadhaarNumber || '—'}</td>
                                    <td>
                                        {l.bankName ? (
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{l.bankName}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{l.ifscCode}</div>
                                            </div>
                                        ) : <span style={{ color: '#475569' }}>—</span>}
                                    </td>
                                    <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{dayjs(l.createdAt).format('DD/MM/YYYY')}</td>
                                    <td>
                                        <button className="btn-secondary btn-sm" onClick={() => openEdit(l)}>✏️ Edit</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="modal-content">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                                {editing ? '✏️ Edit Lender' : '➕ Add Lender'}
                            </h2>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                        </div>
                        <PersonForm
                            title={editing ? 'Update Lender' : 'Add Lender'}
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
