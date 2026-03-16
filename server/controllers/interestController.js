import InterestRecord from '../models/InterestRecord.js';
import InterestPayment from '../models/InterestPayment.js';
import Loan from '../models/Loan.js';
import {
  calculateSimpleInterestDaily,
  getNextInterestPeriodUtc,
} from '../services/interestCalculator.js';

const fullName = (person) => {
  if (!person) return '';
  const parts = [person.name, person.surname].filter(Boolean);
  return parts.join(' ').trim();
};

const toInterestView = ({ record, loan }) => {
  const startDate = record.periodStart || record.startDate;
  const endDate = record.periodEnd || record.endDate;
  const days = record.days ?? record.daysCount;

  const borrowerInterestCalc = calculateSimpleInterestDaily({
    principal: loan.totalLoanAmount,
    annualRatePct: loan.interestRateAnnual,
    periodStart: startDate,
    periodEnd: endDate,
  });

  const isBorrowerRecord = !record.lenderId;
  const lenderInterest = isBorrowerRecord ? 0 : record.interestAmount;
  const borrowerInterest = isBorrowerRecord ? record.interestAmount : borrowerInterestCalc.interestAmount;

  return {
    _id: record._id,
    loanId: loan.loanId, // human-friendly loan id string
    borrowerName: fullName(loan.borrowerId),
    lenderName: isBorrowerRecord ? '' : fullName(record.lenderId),
    principal: record.principal ?? record.principalAmount,
    borrowerInterest,
    lenderInterest,
    rate: isBorrowerRecord ? loan.interestRateAnnual : (record.lenderRate ?? record.interestRate),
    days,
    startDate,
    endDate,
    status: record.status,
    // keep for backward-compat consumers
    interestAmount: record.interestAmount,
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
      : (record?.lenderRate ?? record?.interestRate ?? 0),
    days,
    startDate,
    endDate,
    status: record?.status,
    interestAmount: record?.interestAmount,
  };
};

export const getAllInterestRecords = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

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
    // Backward compatible input: client passes an ISO string as `endDate` today.
    // We treat it as an "as-of" date to decide whether the next cycle is due.
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

    const cycleMonths = Number(loan.interestPeriodMonths);
    if (![1, 3, 6].includes(cycleMonths)) {
      return res.status(400).json({ message: 'Invalid loan interest cycle (interestPeriodMonths must be 1, 3, or 6)' });
    }

    // Find last borrower interest record (lenderId = null) to continue cycles.
    const lastBorrowerRecord = await InterestRecord.findOne({ loanId: loan._id, lenderId: null })
      .sort({ periodEnd: -1 })
      .select('periodEnd')
      .lean();

    const borrowerPeriod = getNextInterestPeriodUtc({
      baseStartDate: loan.disbursementDate,
      lastPeriodEnd: lastBorrowerRecord?.periodEnd || null,
      cycleMonths,
    });

    if (!borrowerPeriod) {
      return res.status(400).json({ message: 'Unable to determine next borrower interest period' });
    }

    if (borrowerPeriod.periodEnd.getTime() > asOf.getTime()) {
      return res.status(400).json({
        message: `Next interest cycle ends on ${borrowerPeriod.periodEnd.toISOString().split('T')[0]}. Interest can be generated only after the period ends.`,
        nextCycleEnd: borrowerPeriod.periodEnd,
      });
    }

    const createdRecords = [];
    let alreadyExistsCount = 0;

    const upsertRecord = async (doc) => {
      const filter = {
        loanId: doc.loanId,
        lenderId: doc.lenderId ?? null,
        periodStart: doc.periodStart,
        periodEnd: doc.periodEnd,
      };

      // Extra safety: if there are legacy records (startDate/endDate), treat them as duplicates too.
      const legacyDup = await InterestRecord.findOne({
        loanId: doc.loanId,
        lenderId: doc.lenderId ?? null,
        $or: [
          { periodStart: doc.periodStart, periodEnd: doc.periodEnd },
          { startDate: doc.periodStart, endDate: doc.periodEnd },
        ],
      }).select('_id');

      if (legacyDup) {
        alreadyExistsCount += 1;
        return;
      }

      const result = await InterestRecord.updateOne(filter, { $setOnInsert: doc }, { upsert: true });
      const upsertedId = result.upsertedId?._id || result.upsertedId;
      if (upsertedId) {
        const inserted = await InterestRecord.findById(upsertedId).populate('lenderId', 'name surname familyGroup');
        createdRecords.push(inserted);
      } else {
        alreadyExistsCount += 1;
      }
    };

    // 1) Borrower interest record
    const borrowerInterest = calculateSimpleInterestDaily({
      principal: loan.totalLoanAmount,
      annualRatePct: loan.interestRateAnnual,
      periodStart: borrowerPeriod.periodStart,
      periodEnd: borrowerPeriod.periodEnd,
    });

    await upsertRecord({
      loanId: loan._id,
      lenderId: null,
      principal: loan.totalLoanAmount,
      borrowerRate: loan.interestRateAnnual,
      lenderRate: null,
      days: borrowerInterest.days,
      periodStart: borrowerPeriod.periodStart,
      periodEnd: borrowerPeriod.periodEnd,
      interestAmount: borrowerInterest.interestAmount,
      status: 'pending',

      // legacy fields
      principalAmount: loan.totalLoanAmount,
      interestRate: loan.interestRateAnnual,
      daysCount: borrowerInterest.days,
      startDate: borrowerPeriod.periodStart,
      endDate: borrowerPeriod.periodEnd,
    });

    // 2) Lender interest records (each lender independently)
    const lenderIds = loan.lenders
      .map((l) => l?.lenderId?._id || l?.lenderId)
      .filter(Boolean);

    const lastLenderRecords = await InterestRecord.find({ loanId: loan._id, lenderId: { $in: lenderIds } })
      .sort({ periodEnd: -1 })
      .select('lenderId periodEnd')
      .lean();

    const lastEndByLenderId = new Map();
    for (const r of lastLenderRecords) {
      const key = String(r.lenderId);
      if (!lastEndByLenderId.has(key) && r.periodEnd) {
        lastEndByLenderId.set(key, r.periodEnd);
      }
    }

    for (const lenderEntry of loan.lenders) {
      const lenderIdDoc = lenderEntry?.lenderId;
      const lenderObjectId = lenderIdDoc?._id || lenderIdDoc;
      if (!lenderObjectId) continue;

      const baseStart = lenderEntry.moneyReceivedDate || lenderEntry.interestStartDate;
      if (!baseStart) continue;

      const lastEnd = lastEndByLenderId.get(String(lenderObjectId)) || null;
      const lenderPeriod = getNextInterestPeriodUtc({
        baseStartDate: baseStart,
        lastPeriodEnd: lastEnd,
        cycleMonths,
      });

      if (!lenderPeriod) continue;

      // If lender joined after the borrower period end, nothing is due for this lender yet.
      if (lenderPeriod.periodEnd.getTime() > asOf.getTime()) {
        continue;
      }

      const lenderInterest = calculateSimpleInterestDaily({
        principal: lenderEntry.amountContributed,
        annualRatePct: lenderEntry.lenderInterestRate,
        periodStart: lenderPeriod.periodStart,
        periodEnd: lenderPeriod.periodEnd,
      });

      await upsertRecord({
        loanId: loan._id,
        lenderId: lenderObjectId,
        principal: lenderEntry.amountContributed,
        borrowerRate: loan.interestRateAnnual,
        lenderRate: lenderEntry.lenderInterestRate,
        days: lenderInterest.days,
        periodStart: lenderPeriod.periodStart,
        periodEnd: lenderPeriod.periodEnd,
        interestAmount: lenderInterest.interestAmount,
        status: 'pending',

        // legacy fields
        principalAmount: lenderEntry.amountContributed,
        interestRate: lenderEntry.lenderInterestRate,
        daysCount: lenderInterest.days,
        startDate: lenderPeriod.periodStart,
        endDate: lenderPeriod.periodEnd,
      });
    }

    if (createdRecords.length === 0) {
      return res.status(200).json({
        message: 'Interest already generated for this period',
        records: [],
        alreadyExistsCount,
      });
    }

    res.status(201).json({
      message: 'Interest generated successfully',
      records: createdRecords.map((r) => toInterestView({ record: r, loan })),
      alreadyExistsCount,
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

    // Keep pending interest view focused on lender payouts (borrower records have lenderId = null)
    const records = await InterestRecord.find({ status: 'pending', lenderId: { $ne: null } })
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

    const total = await InterestRecord.countDocuments({ status: 'pending', lenderId: { $ne: null } });

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
    const { interestRecordId, amountPaid, paymentDate } = req.body;

    const interestRecord = await InterestRecord.findById(interestRecordId);
    if (!interestRecord) {
      return res.status(404).json({ message: 'Interest record not found' });
    }

    if (!interestRecord.lenderId) {
      return res.status(400).json({ message: 'This interest record is not linked to a lender and cannot be marked paid here.' });
    }

    if (amountPaid > interestRecord.interestAmount) {
      return res.status(400).json({
        message: `Amount paid (₹${amountPaid}) exceeds interest amount (₹${interestRecord.interestAmount})`,
      });
    }

    // Create payment record
    const payment = new InterestPayment({
      loanId: interestRecord.loanId,
      lenderId: interestRecord.lenderId,
      interestRecordId,
      amountPaid,
      paymentDate: paymentDate || new Date(),
    });

    await payment.save();

    // If full amount paid, mark interest record as paid
    if (amountPaid === interestRecord.interestAmount) {
      interestRecord.status = 'paid';
      await interestRecord.save();
    }

    res.status(201).json({
      message: 'Interest payment recorded successfully',
      payment,
    });
  } catch (error) {
    console.error('Record interest payment error:', error);
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
  getInterestPayments,
  getInterestRecordsByLoan,
};
