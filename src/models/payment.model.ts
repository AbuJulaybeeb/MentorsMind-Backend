import { db } from "../config/database";
import { logger } from "../utils/logger";

export interface Payment {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed" | "refunded";
  stellar_tx_hash: string | null;
  created_at: Date;
}

export const PaymentModel = {
  async findByUserId(userId: string): Promise<Payment[]> {
    const query =
      "SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC;";
    const { rows } = await db.query(query, [userId]);
    return rows;
  },

  /**
   * Bulk fetch payments for multiple users.
   * Returns one array per requested userId.
   */
  async findByUserIds(userIds: string[]): Promise<Payment[]> {
    if (userIds.length === 0) return [];
    const query =
      "SELECT * FROM transactions WHERE user_id = ANY($1) ORDER BY user_id, created_at DESC;";
    const { rows } = await db.query(query, [userIds]);
    return rows;
  },

  async findEarningsByMentorId(
    mentorId: string,
    from?: string,
    to?: string,
  ): Promise<any[]> {
    let query = `
      SELECT p.*, s.start_time as session_time
      FROM transactions p
      JOIN sessions s ON p.user_id = s.learner_id
      WHERE s.mentor_id = $1
    `;
    const params: any[] = [mentorId];

    if (from) {
      params.push(from);
      query += ` AND p.created_at >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      query += ` AND p.created_at <= $${params.length}`;
    }

    query += " ORDER BY p.created_at DESC;";
    const { rows } = await db.query(query, params);
    return rows;
  },
  /**
   * Delete payments (transactions) older than given number of years.
   * Returns number of records deleted.
   */
  async deleteOlderThanYears(years: number): Promise<number> {
    try {
      const { rowCount } = await db.query(
        `DELETE FROM transactions WHERE created_at < NOW() - ($1::int * INTERVAL '1 year') RETURNING id;`,
        [years],
      );

      const deleted = rowCount ?? 0;
      if (deleted > 0) {
        logger.info("PaymentModel: deleted old payments", { years, deleted });
      }
      return deleted;
    } catch (error) {
      logger.error("Failed to delete old payments:", error);
      return 0;
    }
  },
};
