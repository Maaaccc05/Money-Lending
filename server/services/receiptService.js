import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';

const formatDate = (value) => {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

const formatMoney = (value) => {
  if (value == null || Number.isNaN(Number(value))) return '';
  return Number(value).toFixed(2);
};

const esc = (s) => String(s ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

export const renderReceiptHtml = ({
  loanPublicId,
  borrowerName,
  lenderName,
  periodStart,
  periodEnd,
  interestAmount,
  tdsPercent,
  tdsAmount,
  amountReceived,
  balanceAmount,
  receiptDate,
}) => {
  const paid = amountReceived != null;
  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Interest Receipt</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 24px; }
        h1 { font-size: 18px; margin: 0 0 8px 0; }
        .meta { margin: 0 0 16px 0; color: #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        td { padding: 8px; border: 1px solid #ddd; vertical-align: top; }
        .label { width: 40%; background: #f7f7f7; font-weight: bold; }
        .small { font-size: 11px; color: #555; margin-top: 10px; }
      </style>
    </head>
    <body>
      <h1>Interest Receipt</h1>
      <div class="meta">Receipt Date: ${esc(formatDate(receiptDate))}</div>

      <table>
        <tr><td class="label">Loan ID</td><td>${esc(loanPublicId)}</td></tr>
        <tr><td class="label">Borrower</td><td>${esc(borrowerName)}</td></tr>
        <tr><td class="label">Lender</td><td>${esc(lenderName)}</td></tr>
        <tr><td class="label">Period</td><td>${esc(formatDate(periodStart))} to ${esc(formatDate(periodEnd))}</td></tr>
        <tr><td class="label">Interest Amount</td><td>₹${esc(formatMoney(interestAmount))}</td></tr>
        <tr><td class="label">TDS %</td><td>${esc(tdsPercent ?? '')}${tdsPercent != null ? '%' : ''}</td></tr>
        <tr><td class="label">TDS Amount</td><td>${tdsAmount == null ? (paid ? '₹0.00' : '—') : `₹${esc(formatMoney(tdsAmount))}`}</td></tr>
        <tr><td class="label">Amount Received</td><td>${amountReceived == null ? '—' : `₹${esc(formatMoney(amountReceived))}`}</td></tr>
        <tr><td class="label">Balance (TDS)</td><td>${balanceAmount == null ? (paid ? '₹0.00' : '—') : `₹${esc(formatMoney(balanceAmount))}`}</td></tr>
      </table>

      <div class="small">Note: Balance represents TDS (tax deduction), not pending interest.</div>
    </body>
  </html>`;
};

export const renderLenderSettlementReceiptHtml = ({
  loanPublicId,
  lenderName,
  principalAmount,
  totalInterestPaid,
  paymentDate,
}) => {
  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Lender Settlement Receipt</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 24px; }
        h1 { font-size: 18px; margin: 0 0 8px 0; }
        .meta { margin: 0 0 16px 0; color: #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        td { padding: 8px; border: 1px solid #ddd; vertical-align: top; }
        .label { width: 40%; background: #f7f7f7; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>Lender Settlement Receipt</h1>
      <div class="meta">Payment Date: ${esc(formatDate(paymentDate))}</div>

      <table>
        <tr><td class="label">Loan ID</td><td>${esc(loanPublicId)}</td></tr>
        <tr><td class="label">Lender Name</td><td>${esc(lenderName)}</td></tr>
        <tr><td class="label">Principal Amount</td><td>₹${esc(formatMoney(principalAmount))}</td></tr>
        <tr><td class="label">Total Interest Paid</td><td>₹${esc(formatMoney(totalInterestPaid))}</td></tr>
        <tr><td class="label">Settlement Date</td><td>${esc(formatDate(paymentDate))}</td></tr>
      </table>
    </body>
  </html>`;
};

export const generateReceiptPdf = async ({
  outputDir,
  publicBaseUrlPath,
  html,
  fileNameBase,
}) => {
  const safeBase = String(fileNameBase || 'receipt').replaceAll(/[^a-zA-Z0-9-_]/g, '_');
  const fileName = `${safeBase}-${Date.now()}.pdf`;
  const absDir = path.resolve(outputDir);
  const absPath = path.join(absDir, fileName);

  await fs.mkdir(absDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: absPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '18mm', right: '12mm', bottom: '18mm', left: '12mm' },
    });
  } finally {
    await browser.close();
  }

  const publicUrl = `${publicBaseUrlPath.replace(/\/$/, '')}/${encodeURIComponent(fileName)}`;
  return { absPath, fileName, publicUrl };
};

export default {
  renderReceiptHtml,
  renderLenderSettlementReceiptHtml,
  generateReceiptPdf,
};
