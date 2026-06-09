import { Worker, Job } from 'bullmq';
import { createManagedQueue, enableJobResultCache } from './queue.manager';
import { QUEUE_NAMES, redisConnection } from './queue.config';
import { ExportService } from '../services/export.service';
import { EarningsReportService } from '../services/earningsReport.service';
import { ExportJobModel } from '../models/export-job.model';
import { AuditLoggerService } from '../services/audit-logger.service';
import { LogLevel } from '../utils/log-formatter.utils';
import { logger } from '../utils/logger';

export interface ExportJobData {
  userId: string;
  jobId: string;
  requestId?: string;
  type?: 'earnings-export' | 'data-export';
  format?: string;
  period?: string;
  startDate?: string;
  endDate?: string;
}

export const exportQueue = createManagedQueue<ExportJobData>(QUEUE_NAMES.EXPORT);
// Cache export job results for monitoring and UI lookups.
enableJobResultCache(exportQueue, 3600);

export const exportWorker = new Worker(
  QUEUE_NAMES.EXPORT,
  async (job: Job<ExportJobData>) => {
    const { userId, jobId, type } = job.data;

    if (type === 'earnings-export') {
      const { format, period, startDate, endDate } = job.data;
      await EarningsReportService.processQueuedExport(jobId, userId, (format ?? 'csv') as 'csv' | 'pdf', period || '30d', startDate, endDate);
    } else {
      // Regular data export
      await ExportService.processExport(userId, jobId);
    }
  },
  { connection: redisConnection, concurrency: 5 },
);

exportWorker.on('completed', (job) => {
  logger.info(`Export job ${job.id} completed`);
});

exportWorker.on('failed', async (job, err) => {
  logger.error(`Export job ${job?.id} failed`, { error: err.message });
  if (job) {
    const { jobId, userId } = job.data;
    await ExportJobModel.updateStatus(jobId, 'failed', undefined, err.message);

    await AuditLoggerService.logEvent({
      level: LogLevel.ERROR,
      action: 'DATA_EXPORT_FAILED',
      message: `Data export failed for user ${userId}: ${err.message}`,
      userId: userId,
      entityType: 'export_job',
      entityId: jobId,
      metadata: { error: err.message },
    });
  }
});
