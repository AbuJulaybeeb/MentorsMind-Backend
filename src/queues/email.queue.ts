import { traceStore } from '../middleware/tracing.middleware';
import type { EmailRequest } from '../services/email.service';
import { createManagedQueue, buildJobOptions, JobConfig } from './queue.manager';
import { JOB_RATE_LIMITS, QUEUE_NAMES } from './queue.config';

export interface EmailJobData extends EmailRequest {
  jobType: 'send-email';
  requestId?: string;
  correlationId?: string;
}

export const emailQueue = createManagedQueue<EmailJobData>(QUEUE_NAMES.EMAIL, {
  limiter: JOB_RATE_LIMITS.EMAIL,
});

/**
 * Enqueue an email send job.
 * @param data - Email request payload
 * @param priorityOrConfig - Optional BullMQ priority or advanced job config
 */
export async function enqueueEmail(
  data: EmailRequest,
  priorityOrConfig?: number | Partial<JobConfig>,
): Promise<void> {
  const options: Partial<JobConfig> =
    typeof priorityOrConfig === 'number'
      ? { priority: priorityOrConfig }
      : priorityOrConfig ?? {};

  const context = traceStore.getStore();
  await emailQueue.add(
    options.name ?? 'send-email',
    {
      ...data,
      jobType: 'send-email',
      requestId: context?.requestId,
      correlationId: context?.correlationId,
    },
    buildJobOptions(options),
  );
}
