import cron from 'node-cron';
import { generateDueInterestForAllLoans } from '../services/interestAutoGenerator.js';

const parseBool = (value, defaultValue) => {
  if (value == null) return defaultValue;
  const v = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(v)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(v)) return false;
  return defaultValue;
};

export const startInterestCronJob = () => {
  const enabled = parseBool(process.env.ENABLE_INTEREST_CRON, true);
  if (!enabled) {
    console.log('[interestCron] Disabled via ENABLE_INTEREST_CRON');
    return null;
  }

  // Run once per day. Default to UTC to match UTC date math in interestCalculator.
  const tz = process.env.INTEREST_CRON_TZ || 'UTC';
  const schedule = process.env.INTEREST_CRON_SCHEDULE || '5 0 * * *'; // 00:05 daily

  const task = cron.schedule(
    schedule,
    async () => {
      try {
        const summary = await generateDueInterestForAllLoans({ asOf: new Date() });
        console.log(
          `[interestCron] ${summary.asOf.toISOString()} loans=${summary.loansScanned} borrowerCreated=${summary.borrowerRecordsCreated} lenderCreated=${summary.lenderRecordsCreated} dupSkipped=${summary.skippedDuplicates} errors=${summary.errors}`
        );
      } catch (err) {
        console.error('[interestCron] job error', err);
      }
    },
    { timezone: tz }
  );

  console.log(`[interestCron] Scheduled daily job: "${schedule}" TZ=${tz}`);
  return task;
};

export default {
  startInterestCronJob,
};
