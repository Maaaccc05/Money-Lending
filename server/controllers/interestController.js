import InterestRecord from '../models/InterestRecord.js';
import InterestPayment from '../models/InterestPayment.js';
import Loan from '../models/Loan.js';
import path from 'path';
import { generateCurrentPeriodInterest, generateCurrentPeriodInterestForAllLoans } from '../services/interestAutoGenerator.js';
import { renderReceiptHtml, generateReceiptPdf } from '../services/receiptService.js';

const fullName = (person) => {
  if (!person) return '';
  const parts = [person.name, person.surname].filter(Boolean);
  return parts.join(' ').trim();
};

const toInterestView = ({ record, loan }) => {
  const startDate = record.periodStart || record.startDate;
  const endDate = record.periodEnd || record.endDate;
  const days = record.days ?? record.daysCount;

  const isBorrowerRecord = !record.lenderId;
  const lenderInterest = isBorrowerRecord ? 0 : record.interestAmount;
  const borrowerInterest = isBorrowerRecord ? record.interestAmount : 0;

  return {
    _id: record._id,
    loanId: loan.loanId, // human-friendly loan id string
    borrowerName: fullName(loan.borrowerId),
    lenderName: isBorrowerRecord ? '' : fullName(record.lenderId),
    principal: record.principal ?? record.principalAmount,
    borrowerInterest,
    lenderInterest,
    rate: loan.interestRateAnnual,
    days,
    startDate,
    endDate,
    status: record.status,
    // keep for backward-compat consumers
    interestAmount: record.interestAmount,

    // Payment + TDS + Receipt
    tdsPercent: record.tdsPercent ?? 10,
    tdsAmount: record.tdsAmount ?? null,
    amountReceived: record.amountReceived ?? null,
    balanceAmount: record.balanceAmount ?? null,
    paymentDate: record.paymentDate ?? null,
    receiptPdfUrl: record.receiptPdfUrl ?? null,
  };
};

const safeToInterestView = (record) => {
  const startDate = record?.periodStart || record?.startDate || null;
  const endDate = record?.periodEnd || record?.endDate || null;
  const days = record?.days ?? record?.daysCount ?? null;
  const principal = record?.principal ?? record?.principalAmount ?? 0;
  const isBorrowerRecord = !record?.lenderId;

  return {
    _id: record?._id,
    loanId: record?.loanId?.loanId || record?.loanId?.toString?.() || '',
    borrowerName: record?.loanId?.borrowerId ? fullName(record.loanId.borrowerId) : '',
    lenderName: isBorrowerRecord ? '' : fullName(record?.lenderId),
    principal,
    borrowerInterest: isBorrowerRecord ? (record?.interestAmount ?? 0) : 0,
    lenderInterest: isBorrowerRecord ? 0 : (record?.interestAmount ?? 0),
    rate: isBorrowerRecord
      ? (record?.borrowerRate ?? record?.interestRate ?? 0)
      : (record?.borrowerRate ?? record?.interestRate ?? 0),
    days,
    startDate,
    endDate,
    status: record?.status,
    interestAmount: record?.interestAmount,

    // Payment + TDS + Receipt
    tdsPercent: record?.tdsPercent ?? 10,
    tdsAmount: record?.tdsAmount ?? null,
    amountReceived: record?.amountReceived ?? null,
    balanceAmount: record?.balanceAmount ?? null,
    paymentDate: record?.paymentDate ?? null,
    receiptPdfUrl: record?.receiptPdfUrl ?? null,
  };
};

const buildReceiptData = ({ loan, lender, record }) => {
  const startDate = record.periodStart || record.startDate;
  const endDate = record.periodEnd || record.endDate;

  return {
    loanPublicId: loan?.loanId || '',
    borrowerName: fullName(loan?.borrowerId),
    lenderName: fullName(lender),
    periodStart: startDate,
    periodEnd: endDate,
    interestAmount: record.interestAmount,
    tdsPercent: record.tdsPercent ?? 10,
    tdsAmount: record.tdsAmount ?? null,
    amountReceived: record.amountReceived ?? null,
    balanceAmount: record.balanceAmount ?? null,
    receiptDate: record.paymentDate || new Date(),
  };
};

export const getAllInterestRecords = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    await generateCurrentPeriodInterestForAllLoans({ asOf: new Date() });

    const [records, total] = await Promise.all([
      InterestRecord.find()
        .populate({
          path: 'loanId',
          select: 'loanId totalLoanAmount interestRateAnnual borrowerId',
          populate: { path: 'borrowerId', select: 'name surname' },
        })
        .populate('lenderId', 'name surname familyGroup')
        .sort({ periodEnd: -1, endDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InterestRecord.countDocuments(),
    ]);

    const views = records.map((r) => {
      const loan = r?.loanId && typeof r.loanId === 'object' && r.loanId._id ? r.loanId : null;
      if (!loan) return safeToInterestView(r);

      try {
        return toInterestView({ record: r, loan });
      } catch (e) {
        // Never crash the endpoint due to unexpected/missing fields.
        return safeToInterestView(r);
      }
    });

    res.status(200).json({
      data: views,
      page,
      limit,
      total,
      // Backward-compatible shape
      records: views,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Interest fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch interest records' });
  }
};

export const generateInterest = async (req, res) => {
  try {
    const { loanId } = req.params;
    const asOfDate = req.body.endDate || req.body.asOfDate || new Date().toISOString();
    const asOf = new Date(asOfDate);
    if (Number.isNaN(asOf.getTime())) {
      return res.status(400).json({ message: 'Invalid as-of date' });
    }

    const loan = await Loan.findById(loanId)
      .populate('borrowerId', 'name surname')
      .populate('lenders.lenderId', 'name surname familyGroup');
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    const summary = await generateCurrentPeriodInterest({
      loan: loan.toObject(),
      asOf,
      replaceExisting: true,
    });

    const refreshed = await InterestRecord.find({ loanId: loan._id })
      .populate('lenderId', 'name surname familyGroup')
      .sort({ periodStart: 1, lenderId: 1 })
      .lean();

    const views = refreshed.map((r) => toInterestView({ record: r, loan }));

    res.status(201).json({
      message: 'Interest records regenerated successfully',
      records: views,
      summary,
    });
  } catch (error) {
    console.error('Generate interest error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getPendingInterest = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const scope = String(req.query.scope || 'lender').toLowerCase();

    await generateCurrentPeriodInterestForAllLoans({ asOf: new Date() });

    let match = { status: 'pending', lenderId: { $ne: null } };
    if (scope === 'borrower') {
      match = { status: 'pending', lenderId: null };
    } else if (scope === 'all') {
      match = { status: 'pending' };
    }

    const records = await InterestRecord.find(match)
      .populate({
        path: 'loanId',
        select: 'loanId totalLoanAmount interestRateAnnual borrowerId',
        populate: {
          path: 'borrowerId',
          select: 'name surname',
        },
      })
      .populate('lenderId', 'name surname familyGroup')
      .limit(limit)
      .skip(skip)
      .sort({ periodEnd: 1, endDate: 1 });

    const total = await InterestRecord.countDocuments(match);

    const views = records.map((r) => {
      const loan = r?.loanId && typeof r.loanId === 'object' && r.loanId._id ? r.loanId : null;
      if (!loan) return safeToInterestView(r);
      try {
        return toInterestView({ record: r, loan });
      } catch (_) {
        return safeToInterestView(r);
      }
    });

    res.status(200).json({
      records: views,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const recordInterestPayment = async (req, res) => {
  try {
    const { interestRecordId, amountReceived, amountPaid, paymentDate } = req.body;

    const interestRecord = await InterestRecord.findById(interestRecordId);
    if (!interestRecord) {
      return res.status(404).json({ message: 'Interest record not found' });
    }

    if (!interestRecord.lenderId) {
      return res.status(400).json({ message: 'This interest record is not linked to a lender and cannot be marked paid here.' });
    }

    if (interestRecord.status === 'paid') {
      return res.status(400).json({ message: 'This interest record is already marked as paid.' });
    }

    const received = Number(amountReceived ?? amountPaid);
    if (Number.isNaN(received) || received < 0) {
      return res.status(400).json({ message: 'amountReceived must be a non-negative number' });
    }

    if (received > interestRecord.interestAmount) {
      return res.status(400).json({
        message: `Amount received (₹${received}) exceeds interest amount (₹${interestRecord.interestAmount})`,
      });
    }

    const computedTdsAmount = Math.round((interestRecord.interestAmount - received) * 100) / 100;
    const computedTdsPercent = interestRecord.interestAmount > 0
      ? Math.round(((computedTdsAmount / interestRecord.interestAmount) * 100) * 100) / 100
      : 0;

    const paidOn = paymentDate ? new Date(paymentDate) : new Date();
    if (Number.isNaN(paidOn.getTime())) {
      return res.status(400).json({ message: 'Invalid paymentDate' });
    }

    // Update the interest record payment breakdown (TDS is the "balance")
    interestRecord.amountReceived = received;
    interestRecord.tdsAmount = computedTdsAmount;
    interestRecord.balanceAmount = computedTdsAmount;
    interestRecord.tdsPercent = computedTdsPercent;
    interestRecord.paymentDate = paidOn;
    interestRecord.status = 'paid';

    // Generate PDF receipt
    const populated = await InterestRecord.findById(interestRecordId)
      .populate({
        path: 'loanId',
        select: 'loanId borrowerId',
        populate: { path: 'borrowerId', select: 'name surname' },
      })
      .populate('lenderId', 'name surname');

    const receiptHtml = renderReceiptHtml(
      buildReceiptData({
        loan: populated?.loanId,
        lender: populated?.lenderId,
        record: interestRecord,
      })
    );

    const { publicUrl } = await generateReceiptPdf({
      outputDir: path.resolve(process.cwd(), 'receipts'),
      publicBaseUrlPath: '/receipts',
      html: receiptHtml,
      fileNameBase: `interest-${interestRecordId}`,
    });

    interestRecord.receiptPdfUrl = publicUrl;
    await interestRecord.save();

    // Create payment record (keep legacy amountPaid for backward compatibility)
    const payment = new InterestPayment({
      loanId: interestRecord.loanId,
      lenderId: interestRecord.lenderId,
      interestRecordId,
      amountPaid: received,
      amountReceived: received,
      tdsPercent: computedTdsPercent,
      tdsAmount: computedTdsAmount,
      balanceAmount: computedTdsAmount,
      receiptPdfUrl: publicUrl,
      paymentDate: paidOn,
    });

    await payment.save();

    res.status(201).json({
      message: 'Interest payment recorded successfully',
      payment,
    });
  } catch (error) {
    console.error('Record interest payment error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getInterestReceipt = async (req, res) => {
  try {
    const { id } = req.params;

    const record = await InterestRecord.findById(id)
      .populate({
        path: 'loanId',
        select: 'loanId borrowerId',
        populate: { path: 'borrowerId', select: 'name surname' },
      })
      .populate('lenderId', 'name surname');

    if (!record) return res.status(404).json({ message: 'Interest record not found' });
    if (!record.lenderId) return res.status(400).json({ message: 'No lender receipt for borrower-level interest record.' });

    if (record.receiptPdfUrl) {
      return res.status(200).json({ receiptPdfUrl: record.receiptPdfUrl, record: safeToInterestView(record) });
    }

    // If missing, generate on-demand.
    const receiptHtml = renderReceiptHtml(
      buildReceiptData({ loan: record.loanId, lender: record.lenderId, record })
    );

    const { publicUrl } = await generateReceiptPdf({
      outputDir: path.resolve(process.cwd(), 'receipts'),
      publicBaseUrlPath: '/receipts',
      html: receiptHtml,
      fileNameBase: `interest-${record._id}`,
    });

    // Data integrity: do not mutate paid records outside of payment flow.
    if (record.status !== 'paid') {
      record.receiptPdfUrl = publicUrl;
      await record.save();
    }

    return res.status(200).json({ receiptPdfUrl: publicUrl, record: safeToInterestView(record) });
  } catch (error) {
    console.error('Get interest receipt error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getInterestPayments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const payments = await InterestPayment.find()
      .populate('loanId', 'loanId totalLoanAmount')
      .populate('lenderId', 'name surname')
      .limit(limit)
      .skip(skip)
      .sort({ paymentDate: -1 });

    const total = await InterestPayment.countDocuments();

    res.status(200).json({
      payments,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getInterestRecordsByLoan = async (req, res) => {
  try {
    const { loanId } = req.params;

    const loan = await Loan.findById(loanId)
      .populate('borrowerId', 'name surname')
      .select('loanId borrowerId totalLoanAmount interestRateAnnual');

    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    await generateCurrentPeriodInterest({ loan: loan.toObject(), asOf: new Date(), replaceExisting: true });

    const records = await InterestRecord.find({ loanId: loan._id })
      .populate('lenderId', 'name surname')
      .sort({ periodStart: 1, startDate: 1 });

    res.status(200).json(records.map((r) => toInterestView({ record: r, loan })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export default {
  generateInterest,
  getAllInterestRecords,
  getPendingInterest,
  recordInterestPayment,
  getInterestReceipt,
  getInterestPayments,
  getInterestRecordsByLoan,
};
