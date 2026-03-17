import cron from 'node-cron';
import path from 'path';
import InterestRecord from '../models/InterestRecord.js';
import { renderReceiptHtml, generateReceiptPdf } from '../services/receiptService.js';

const toUtcStartOfDay = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

export const backfillMissingReceiptsOnce = async ({ asOf = new Date(), limit = 25 } = {}) => {
  const asOfUtc = toUtcStartOfDay(asOf);

  const records = await InterestRecord.find({
    status: 'pending',
    lenderId: { $ne: null },
    receiptPdfUrl: null,
    $or: [
      { periodEnd: { $lte: asOfUtc } },
      // Legacy fallback
      { endDate: { $lte: asOfUtc } },
    ],
  })
    .sort({ periodEnd: 1, endDate: 1 })
    .limit(limit)
    .populate({
      path: 'loanId',
      select: 'loanId borrowerId',
      populate: { path: 'borrowerId', select: 'name surname' },
    })
    .populate('lenderId', 'name surname');

  let generated = 0;
  for (const record of records) {
    try {
      const start = record.periodStart || record.startDate;
      const end = record.periodEnd || record.endDate;

      const html = renderReceiptHtml({
        loanPublicId: record?.loanId?.loanId || '',
        borrowerName: record?.loanId?.borrowerId
          ? `${record.loanId.borrowerId.name || ''} ${record.loanId.borrowerId.surname || ''}`.trim()
          : '',
        lenderName: record?.lenderId
          ? `${record.lenderId.name || ''} ${record.lenderId.surname || ''}`.trim()
          : '',
        periodStart: start,
        periodEnd: end,
        interestAmount: record.interestAmount,
        tdsPercent: record.tdsPercent ?? 10,
        tdsAmount: record.tdsAmount ?? null,
        amountReceived: record.amountReceived ?? null,
        balanceAmount: record.balanceAmount ?? null,
        receiptDate: new Date(),
      });

      const { publicUrl } = await generateReceiptPdf({
        outputDir: path.resolve(process.cwd(), 'receipts'),
        publicBaseUrlPath: '/receipts',
        html,
        fileNameBase: `interest-${record._id}`,
      });

      record.receiptPdfUrl = publicUrl;
      await record.save();
      generated += 1;
    } catch (err) {
      // Continue processing other receipts; do not break cron.
      console.error('Receipt backfill failed for record', record?._id?.toString?.(), err);
    }
  }

  return { scanned: records.length, generated };
};

export const startReceiptCronJob = () => {
  // Daily at 00:20
  cron.schedule('20 0 * * *', async () => {
    try {
      const res = await backfillMissingReceiptsOnce({ limit: 50 });
      console.log(`[receipt-cron] scanned=${res.scanned} generated=${res.generated}`);
    } catch (err) {
      console.error('[receipt-cron] error:', err);
    }
  });
};
