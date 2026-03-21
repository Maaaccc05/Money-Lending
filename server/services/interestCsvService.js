import InterestRecord from '../models/InterestRecord.js';

const asDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const sameUtcDate = (a, b) => {
  const left = asDate(a);
  const right = asDate(b);
  if (!left || !right) return false;
  return (
    left.getUTCFullYear() === right.getUTCFullYear() &&
    left.getUTCMonth() === right.getUTCMonth() &&
    left.getUTCDate() === right.getUTCDate()
  );
};

const fullName = (person) => {
  if (!person) return '';
  return [person.name, person.surname].filter(Boolean).join(' ').trim();
};

const getPeriodBounds = (record) => ({
  periodStart: asDate(record.periodStart || record.startDate),
  periodEnd: asDate(record.periodEnd || record.endDate),
});

const samePeriod = (record, periodStart, periodEnd) => {
  const bounds = getPeriodBounds(record);
  return sameUtcDate(bounds.periodStart, periodStart) && sameUtcDate(bounds.periodEnd, periodEnd);
};

const toBreakdownRow = ({ loanEntry, lenderRecord }) => {
  const lender = lenderRecord?.lenderId || loanEntry?.lenderId;
  const accountNo = lender?.bankAccountNumber || '';
  const ifscCode = lender?.ifscCode || '';
  const bankName = lender?.bankName || '';

  const missingFields = [];
  if (!accountNo) missingFields.push('Account No');
  if (!ifscCode) missingFields.push('IFSC');
  if (!bankName) missingFields.push('Bank Name');

  return {
    interestRecordId: lenderRecord?._id || null,
    lenderId: lender?._id || null,
    lenderName: fullName(lender),
    contributionAmount: Number(loanEntry?.amountContributed ?? lenderRecord?.principal ?? 0),
    interestShare: Number(lenderRecord?.interestAmount || 0),
    lenderStatus: loanEntry?.status || 'active',
    interestStatus: lenderRecord?.status || 'pending',
    bankDetails: {
      accountNo,
      ifscCode,
      bankName,
    },
    missingFields,
    canDownloadCsv: missingFields.length === 0,
  };
};

const csvEscape = (value) => {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const formatDate = (value) => {
  const date = asDate(value);
  if (!date) return '';
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = String(date.getUTCFullYear());
  return `${day}/${month}/${year}`;
};

const formatExcelTextIdentifier = (value) => {
  const str = value == null ? '' : String(value).trim();
  if (!str) return '';

  // Force Excel to treat large/critical numeric identifiers as text.
  // This preserves full digits and avoids scientific notation.
  return `="${str.replace(/"/g, '""')}"`;
};

const sanitizeFileSegment = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'record';

export const getInterestRecordDetailsData = async (recordId) => {
  const baseRecord = await InterestRecord.findById(recordId)
    .populate({
      path: 'loanId',
      select: 'loanId totalLoanAmount disbursementDate borrowerId lenders',
      populate: [
        { path: 'borrowerId', select: 'name surname' },
        {
          path: 'lenders.lenderId',
          // bankAccountNumber is select:false in model; include explicitly.
          select: 'name surname ifscCode bankName status +bankAccountNumber',
        },
      ],
    })
    .lean();

  if (!baseRecord) {
    const error = new Error('Interest record not found');
    error.status = 404;
    throw error;
  }

  const loan = baseRecord.loanId;
  if (!loan || !loan._id) {
    const error = new Error('Loan data missing for this interest record');
    error.status = 400;
    throw error;
  }

  const { periodStart, periodEnd } = getPeriodBounds(baseRecord);
  if (!periodStart || !periodEnd) {
    const error = new Error('Period dates are missing for this interest record');
    error.status = 400;
    throw error;
  }

  const allLenderRecords = await InterestRecord.find({
    loanId: loan._id,
    lenderId: { $ne: null },
  })
    .populate('lenderId', 'name surname ifscCode bankName +bankAccountNumber')
    .lean();

  const lenderRecordsForPeriod = allLenderRecords.filter((record) => samePeriod(record, periodStart, periodEnd));

  const contributionByLender = new Map(
    (loan.lenders || [])
      .filter((entry) => entry?.lenderId?._id)
      .map((entry) => [entry.lenderId._id.toString(), entry])
  );

  const lenderBreakdown = lenderRecordsForPeriod
    .map((lenderRecord) => {
      const lenderKey = lenderRecord?.lenderId?._id?.toString?.();
      const loanEntry = lenderKey ? contributionByLender.get(lenderKey) : null;
      return toBreakdownRow({ loanEntry, lenderRecord });
    })
    .sort((a, b) => a.lenderName.localeCompare(b.lenderName));

  const totalBreakdownInterest = lenderBreakdown.reduce((sum, row) => sum + row.interestShare, 0);

  return {
    recordId: baseRecord._id,
    periodStart,
    periodEnd,
    dueDate: periodEnd,
    status: baseRecord.status,
    borrower: {
      borrowerName: fullName(loan.borrowerId),
      loanObjectId: loan._id,
      loanId: loan.loanId,
      totalLoanAmount: Number(loan.totalLoanAmount || 0),
      interestAmount: totalBreakdownInterest > 0
        ? Number(totalBreakdownInterest.toFixed(2))
        : Number(baseRecord.interestAmount || 0),
    },
    lenderBreakdown,
  };
};

export const generateInterestCSV = async (recordId, lenderId = null) => {
  const details = await getInterestRecordDetailsData(recordId);

  let rows = details.lenderBreakdown;
  if (lenderId) {
    rows = rows.filter((row) => row.lenderId?.toString?.() === lenderId.toString());
    if (!rows.length) {
      const error = new Error('Lender not found for this interest record period');
      error.status = 404;
      throw error;
    }
  }

  const invalidRow = rows.find((row) => !row.canDownloadCsv);
  if (invalidRow) {
    const error = new Error(`Missing lender bank details for ${invalidRow.lenderName}: ${invalidRow.missingFields.join(', ')}`);
    error.status = 400;
    throw error;
  }

  const header = [
    'Loan ID',
    'Borrower Name',
    'Lender Name',
    'Interest Amount',
    'Due Date',
    'Lender Contribution',
    'Lender Bank Account No',
    'Lender IFSC',
    'Lender Bank Name',
  ];

  const lines = [header.map(csvEscape).join(',')];
  rows.forEach((row) => {
    const line = [
      details.borrower.loanId,
      details.borrower.borrowerName,
      row.lenderName,
      row.interestShare,
      formatDate(details.dueDate),
      row.contributionAmount,
      formatExcelTextIdentifier(row.bankDetails.accountNo),
      row.bankDetails.ifscCode,
      row.bankDetails.bankName,
    ];
    lines.push(line.map(csvEscape).join(','));
  });

  const primaryRow = rows[0];
  const fileName = `interest-${sanitizeFileSegment(details.borrower.loanId)}-${sanitizeFileSegment(primaryRow?.lenderName || 'all-lenders')}-${formatDate(details.dueDate) || 'due'}.csv`;

  return {
    fileName,
    contentType: 'text/csv; charset=utf-8',
    csv: `${lines.join('\n')}\n`,
  };
};
