import { createManagedQueue, buildJobOptions, JobConfig } from './queue.manager';
import { JOB_RATE_LIMITS, QUEUE_NAMES } from './queue.config';

export interface NotificationJobData {
  /** Target user ID. */
  userId: string;
  /** Notification type (maps to NotificationType enum values). */
  type: string;
  /** Channels to fan-out: 'websocket' | 'push' | 'email'. */
  channels: Array<'websocket' | 'push' | 'email'>;
  title: string;
  message: string;
  /** Optional stored notification record ID for delivery tracking. */
  notificationId?: string;
  /** Arbitrary payload forwarded to WebSocket/push clients. */
  data?: Record<string, unknown>;
}

/** BullMQ queue for notification fan-out (WebSocket + push). */
export const notificationQueue = createManagedQueue<NotificationJobData>(
  QUEUE_NAMES.NOTIFICATIONS,
  {
    limiter: JOB_RATE_LIMITS.NOTIFICATIONS,
  },
);

/** Enqueue a notification fan-out job. */
export async function enqueueNotification(
  data: NotificationJobData,
  options?: Partial<JobConfig>,
): Promise<void> {
  await notificationQueue.add(
    options?.name ?? 'fan-out-notification',
    data,
    buildJobOptions(options),
  );
}
