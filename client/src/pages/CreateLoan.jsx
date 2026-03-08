import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchBorrowers, searchLenders, createLoan } from '../services/api';
import dayjs from 'dayjs';

const formatCurrency = (v) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

const AutocompleteSearch = ({ placeholder, onSelect, label }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const ref = useRef();

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length < 1) { setResults([]); return; }
            try {
                const fn = label === 'borrower' ? searchBorrowers : searchLenders;
                const res = await fn(query);
                setResults(res.data.data || []);
                setOpen(true);
            } catch { }
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const select = (person) => {
        setSelected(person);
        setQuery(`${person.name} ${person.surname}`);
        setOpen(false);
        setResults([]);
        onSelect(person);
    };

    const clear = () => {
        setSelected(null);
        setQuery('');
        onSelect(null);
    };

    return (
        <div className="autocomplete-wrapper" ref={ref}>
            <div style={{ position: 'relative' }}>
                <input
                    className="form-input"
                    placeholder={placeholder}
                    value={query}
                    onChange={e => { setQuery(e.target.value); if (selected) clear(); }}
                    onFocus={() => results.length > 0 && setOpen(true)}
                />
                {selected && (
                    <button onClick={clear} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem' }}>×</button>
                )}
            </div>
            {open && results.length > 0 && (
                <div className="autocomplete-dropdown">
                    {results.map(p => (
                        <div key={p._id} className="autocomplete-item" onClick={() => select(p)}>
                            <div style={{ fontWeight: 600 }}>{p.name} {p.surname}</div>
                            {p.familyGroup && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.familyGroup}</div>}
                        </div>
                    ))}
                </div>
            )}
            {open && results.length === 0 && query.length > 1 && (
                <div className="autocomplete-dropdown">
                    <div className="autocomplete-item" style={{ color: '#64748b' }}>No results found</div>
                </div>
            )}
        </div>
    );
};

export default function CreateLoan() {
    const navigate = useNavigate();
    const [borrower, setBorrower] = useState(null);
    const [lenderEntries, setLenderEntries] = useState([
        { lender: null, amountContributed: '', lenderInterestRate: '', moneyReceivedDate: '' }
    ]);
    const [formData, setFormData] = useState({
        disbursementDate: dayjs().format('YYYY-MM-DD'),
        interestRateAnnual: '',
        interestPeriodMonths: '1',
        notes: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const totalLenderAmount = lenderEntries.reduce((sum, e) => sum + (parseFloat(e.amountContributed) || 0), 0);

    const addLenderEntry = () => {
        setLenderEntries(prev => [...prev, { lender: null, amountContributed: '', lenderInterestRate: '', moneyReceivedDate: '' }]);
    };

    const removeLenderEntry = (idx) => {
        setLenderEntries(prev => prev.filter((_, i) => i !== idx));
    };

    const updateLenderEntry = (idx, field, value) => {
        setLenderEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!borrower) { setError('Please select a borrower.'); return; }
        if (lenderEntries.length === 0) { setError('At least one lender is required.'); return; }

        for (let i = 0; i < lenderEntries.length; i++) {
            const entry = lenderEntries[i];
            if (!entry.lender) { setError(`Please select lender ${i + 1}.`); return; }
            if (!entry.amountContributed || parseFloat(entry.amountContributed) <= 0) { setError(`Please enter amount for lender ${i + 1}.`); return; }
            if (!entry.lenderInterestRate || parseFloat(entry.lenderInterestRate) <= 0) { setError(`Please enter interest rate for lender ${i + 1}.`); return; }
            if (!entry.moneyReceivedDate) { setError(`Please enter money received date for lender ${i + 1}.`); return; }
        }

        setLoading(true);
        try {
            const payload = {
                borrowerId: borrower._id,
                totalLoanAmount: totalLenderAmount,
                disbursementDate: formData.disbursementDate,
                interestRateAnnual: parseFloat(formData.interestRateAnnual) || 0,
                interestPeriodMonths: parseInt(formData.interestPeriodMonths),
                notes: formData.notes,
                lenders: lenderEntries.map(e => ({
                    lenderId: e.lender._id,
                    amountContributed: parseFloat(e.amountContributed),
                    lenderInterestRate: parseFloat(e.lenderInterestRate),
                    moneyReceivedDate: e.moneyReceivedDate,
                })),
            };
            const res = await createLoan(payload);
            navigate(`/loans/${res.data.data._id}`);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create loan.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fade-in">
            <div style={{ marginBottom: '2rem' }}>
                <h1 className="page-title">Create New Loan</h1>
                <p className="page-subtitle">Set up a new loan with borrower and lender details</p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '900px' }}>
                {error && <div className="alert alert-error">{error}</div>}

                {/* Step 1: Borrower */}
                <div className="card">
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
                        Step 1 — Select Borrower
                    </h3>
                    <div className="form-group">
                        <label className="form-label">Search Borrower *</label>
                        <AutocompleteSearch
                            placeholder="Type name to search borrowers..."
                            label="borrower"
                            onSelect={setBorrower}
                        />
                    </div>
                    {borrower && (
                        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(99,102,241,0.08)', borderRadius: '0.75rem', border: '1px solid rgba(99,102,241,0.2)' }}>
                            <div style={{ fontWeight: 700 }}>✓ {borrower.name} {borrower.surname}</div>
                            {borrower.familyGroup && <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Family: {borrower.familyGroup}</div>}
                            {borrower.address && <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{borrower.address}</div>}
                        </div>
                    )}
                </div>

                {/* Step 2: Loan Terms */}
                <div className="card">
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
                        Step 2 — Loan Terms
                    </h3>
                    <div className="grid-2">
                        <div className="form-group">
                            <label className="form-label">Disbursement Date *</label>
                            <input
                                className="form-input"
                                type="date"
                                value={formData.disbursementDate}
                                onChange={e => setFormData(p => ({ ...p, disbursementDate: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Interest Rate (Annual %) *</label>
                            <input
                                className="form-input"
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="e.g. 12"
                                value={formData.interestRateAnnual}
                                onChange={e => setFormData(p => ({ ...p, interestRateAnnual: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Interest Period *</label>
                            <select
                                className="form-select"
                                value={formData.interestPeriodMonths}
                                onChange={e => setFormData(p => ({ ...p, interestPeriodMonths: e.target.value }))}
                            >
                                <option value="1">1 Month</option>
                                <option value="3">3 Months (Quarterly)</option>
                                <option value="6">6 Months (Half-yearly)</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Notes (optional)</label>
                            <input className="form-input" placeholder="Optional notes..." value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} />
                        </div>
                    </div>
                </div>

                {/* Step 3: Lenders */}
                <div className="card">
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
                        Step 3 — Add Lenders *
                    </h3>

                    {lenderEntries.map((entry, idx) => (
                        <div key={idx} style={{
                            background: 'rgba(0,0,0,0.2)', borderRadius: '0.75rem', padding: '1.25rem',
                            marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.05)',
                            position: 'relative',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#a5b4fc' }}>Lender #{idx + 1}</span>
                                {lenderEntries.length > 1 && (
                                    <button type="button" onClick={() => removeLenderEntry(idx)} style={{
                                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                                        color: '#f87171', borderRadius: '0.375rem', padding: '0.25rem 0.5rem',
                                        cursor: 'pointer', fontSize: '0.8rem',
                                    }}>✕ Remove</button>
                                )}
                            </div>
                            <div className="grid-2" style={{ gap: '0.875rem' }}>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">Search Lender *</label>
                                    <AutocompleteSearch
                                        placeholder="Type name to search lenders..."
                                        label="lender"
                                        onSelect={(l) => updateLenderEntry(idx, 'lender', l)}
                                    />
                                </div>
                                {entry.lender && (
                                    <div style={{ gridColumn: '1 / -1', padding: '0.75rem', background: 'rgba(16,185,129,0.08)', borderRadius: '0.5rem', border: '1px solid rgba(16,185,129,0.2)', fontSize: '0.85rem', fontWeight: 600 }}>
                                        ✓ {entry.lender.name} {entry.lender.surname} {entry.lender.familyGroup && `(${entry.lender.familyGroup})`}
                                    </div>
                                )}
                                <div className="form-group">
                                    <label className="form-label">Amount Contributed (₹) *</label>
                                    <input
                                        className="form-input"
                                        type="number"
                                        min="1"
                                        placeholder="e.g. 100000"
                                        value={entry.amountContributed}
                                        onChange={e => updateLenderEntry(idx, 'amountContributed', e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Lender Interest Rate (Annual %) *</label>
                                    <input
                                        className="form-input"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="e.g. 10"
                                        value={entry.lenderInterestRate}
                                        onChange={e => updateLenderEntry(idx, 'lenderInterestRate', e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Money Received Date *</label>
                                    <input
                                        className="form-input"
                                        type="date"
                                        value={entry.moneyReceivedDate}
                                        onChange={e => updateLenderEntry(idx, 'moneyReceivedDate', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}

                    <button type="button" className="btn-secondary" onClick={addLenderEntry} style={{ width: '100%', justifyContent: 'center' }}>
                        ＋ Add Another Lender
                    </button>

                    {totalLenderAmount > 0 && (
                        <div style={{ marginTop: '1rem', padding: '0.875rem', background: 'rgba(99,102,241,0.1)', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#94a3b8', fontWeight: 600 }}>Total Loan Amount:</span>
                            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#a5b4fc' }}>{formatCurrency(totalLenderAmount)}</span>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '0.875rem 2.5rem' }}>
                        {loading ? <><div className="loading-spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} /> Creating...</> : '✓ Create Loan'}
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => navigate(-1)} style={{ padding: '0.875rem 2rem' }}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
