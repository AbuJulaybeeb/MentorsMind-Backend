import pool, { db } from "../config/database";
import { CollaborationState } from "../types/collaboration.types";
import { PaginationUtil } from "../utils/pagination.utils";
import { logger } from "../utils/logger";

export interface Session {
  id: string;
  mentor_id: string;
  learner_id: string;
  start_time: Date;
  end_time: Date;
  status: "scheduled" | "completed" | "cancelled";
  created_at: Date;
}

export interface SessionRecord {
  id: string;
  mentor_id: string;
  mentee_id: string;
  title: string;
  description: string | null;
  scheduled_at: Date;
  duration_minutes: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  meeting_link: string | null;
  meeting_url: string | null;
  meeting_provider: string | null;
  meeting_room_id: string | null;
  meeting_expires_at: Date | null;
  needs_manual_intervention: boolean;
  collaboration_state: CollaborationState | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSessionPayload {
  mentorId: string;
  menteeId: string;
  title: string;
  description?: string;
  scheduledAt: Date;
  durationMinutes: number;
}

export interface UpdateMeetingUrlPayload {
  meetingUrl: string;
  meetingProvider: string;
  meetingRoomId: string;
  meetingExpiresAt: Date;
}

export interface UpdateCollaborationStatePayload {
  collaborationState: CollaborationState;
}

/**
 * Session Model - Database operations for mentorship sessions
 */
export const SessionModel = {
  /**
   * Create a new session
   */
  async create(payload: CreateSessionPayload): Promise<SessionRecord> {
    const query = `
      INSERT INTO sessions (mentor_id, mentee_id, title, description, scheduled_at, duration_minutes, collaboration_state)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const defaultState = null;
    const { rows } = await db.query(query, [
      payload.mentorId,
      payload.menteeId,
      payload.title,
      payload.description || null,
      payload.scheduledAt,
      payload.durationMinutes,
      defaultState,
    ]);

    return rows[0];
  },

  /**
   * Find session by ID
   */
  async findById(id: string): Promise<SessionRecord | null> {
    const query = "SELECT * FROM sessions WHERE id = $1";
    const { rows } = await db.query(query, [id]);
    return rows[0] ?? null;
  },

  /**
   * Find sessions by user ID (either as mentor or mentee) with cursor pagination
   */
  async findByUserIdPaginated(
    userId: string,
    filters: { cursor?: string; limit?: number },
  ): Promise<{
    sessions: SessionRecord[];
    next_cursor: string | null;
    has_more: boolean;
    total: number;
  }> {
    const limit = filters.limit ?? 20;

    const conditions: string[] = ["(mentor_id = $1 OR mentee_id = $1)"];
    const params: unknown[] = [userId];
    let idx = 2;

    if (filters.cursor) {
      const decoded = PaginationUtil.decodeCursor(filters.cursor);
      if (decoded) {
        conditions.push(`(scheduled_at, id) < ($${idx}, $${idx + 1})`);
        params.push(decoded.created_at, decoded.id);
        idx += 2;
      }
    }

    const [{ rows }, { rows: countRows }] = await Promise.all([
      pool.query<SessionRecord>(
        `SELECT * FROM sessions
         WHERE ${conditions.join(" AND ")}
         ORDER BY scheduled_at DESC, id DESC
         LIMIT $${idx}`,
        [...params, limit + 1],
      ),
      pool.query(
        `SELECT COUNT(*) FROM sessions WHERE mentor_id = $1 OR mentee_id = $1`,
        [userId],
      ),
    ]);

    const has_more = rows.length > limit;
    const data = has_more ? rows.slice(0, limit) : rows;

    const lastItem = data[data.length - 1];
    const next_cursor =
      has_more && lastItem
        ? PaginationUtil.encodeCursor({
            id: lastItem.id,
            created_at: lastItem.scheduled_at.toISOString(),
          })
        : null;

    return {
      sessions: data,
      next_cursor,
      has_more,
      total: parseInt(countRows[0].count, 10),
    };
  },

  /**
   * Find all sessions for a user (both as mentor and mentee)
   */
  async findByUserId(userId: string): Promise<SessionRecord[]> {
    const query = `
      SELECT * FROM sessions
      WHERE mentor_id = $1 OR mentee_id = $1
      ORDER BY scheduled_at DESC, id DESC
    `;

    const { rows } = await pool.query<SessionRecord>(query, [userId]);
    return rows;
  },

  /**
   * Find upcoming sessions for a user
   */
  async findUpcomingByUserId(userId: string): Promise<SessionRecord[]> {
    const query = `
      SELECT * FROM sessions
      WHERE (mentor_id = $1 OR mentee_id = $1)
        AND scheduled_at >= NOW()
        AND status IN ('pending', 'confirmed')
      ORDER BY scheduled_at ASC
    `;

    const { rows } = await pool.query<SessionRecord>(query, [userId]);
    return rows;
  },

  /**
   * Update session status
   */
  async updateStatus(
    id: string,
    status: string,
  ): Promise<SessionRecord | null> {
    const query = `
      UPDATE sessions
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const { rows } = await pool.query<SessionRecord>(query, [status, id]);
    return rows[0] ?? null;
  },

  /**
   * Update meeting URL and related fields
   */
  async updateMeetingUrl(
    id: string,
    payload: UpdateMeetingUrlPayload,
  ): Promise<SessionRecord | null> {
    const query = `
      UPDATE sessions
      SET
        meeting_url = $1,
        meeting_provider = $2,
        meeting_room_id = $3,
        meeting_expires_at = $4,
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `;

    const { rows } = await pool.query<SessionRecord>(query, [
      payload.meetingUrl,
      payload.meetingProvider,
      payload.meetingRoomId,
      payload.meetingExpiresAt,
      id,
    ]);

    return rows[0] ?? null;
  },

  /**
   * Update collaboration state for a session
   */
  async updateCollaborationState(
    id: string,
    collaborationState: CollaborationState,
  ): Promise<SessionRecord | null> {
    const query = `
      UPDATE sessions
      SET collaboration_state = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const { rows } = await pool.query<SessionRecord>(query, [
      collaborationState,
      id,
    ]);
    return rows[0] ?? null;
  },

  /**
   * Mark session for manual intervention
   */
  async markForManualIntervention(id: string): Promise<SessionRecord | null> {
    const query = `
      UPDATE sessions
      SET
        needs_manual_intervention = TRUE,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const { rows } = await pool.query<SessionRecord>(query, [id]);
    return rows[0] ?? null;
  },

  /**
   * Get sessions needing manual intervention
   */
  async findNeedingManualIntervention(): Promise<SessionRecord[]> {
    const query = `
      SELECT * FROM sessions
      WHERE needs_manual_intervention = TRUE
      ORDER BY created_at DESC
    `;

    const { rows } = await pool.query<SessionRecord>(query);
    return rows;
  },

  /**
   * Get expired meetings
   */
  async findExpiredMeetings(): Promise<SessionRecord[]> {
    const query = `
      SELECT * FROM sessions
      WHERE meeting_expires_at IS NOT NULL
        AND meeting_expires_at < NOW()
        AND status IN ('confirmed', 'completed')
      ORDER BY meeting_expires_at ASC
    `;

    const { rows } = await pool.query<SessionRecord>(query);
    return rows;
  },

  /**
   * Clear manual intervention flag
   */
  async clearManualIntervention(id: string): Promise<boolean> {
    const query = `
      UPDATE sessions
      SET
        needs_manual_intervention = FALSE,
        updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `;

    const { rowCount } = await pool.query(query, [id]);
    return (rowCount ?? 0) > 0;
  },

  /**
   * Delete a session
   */
  async delete(id: string): Promise<boolean> {
    const query = "DELETE FROM sessions WHERE id = $1 RETURNING id";
    const { rowCount } = await pool.query(query, [id]);
    return (rowCount ?? 0) > 0;
  },

  /**
   * Archive sessions older than the specified number of years.
   * Moves rows into `sessions_archive` and deletes from `sessions` in a single CTE.
   * Returns number of archived sessions.
   */
  async archiveOlderThanYears(years: number): Promise<number> {
    const moveQuery = `
      WITH moved AS (
        DELETE FROM sessions
        WHERE created_at < NOW() - ($1::int * INTERVAL '1 year')
        RETURNING id, mentor_id, mentee_id, title, description, scheduled_at, duration_minutes, status, meeting_link, meeting_url, meeting_provider, meeting_room_id, meeting_expires_at, needs_manual_intervention, notes, created_at, updated_at
      )
      INSERT INTO sessions_archive (id, mentor_id, mentee_id, title, description, scheduled_at, duration_minutes, status, meeting_link, meeting_url, meeting_provider, meeting_room_id, meeting_expires_at, needs_manual_intervention, notes, created_at, updated_at, archived_at)
      SELECT id, mentor_id, mentee_id, title, description, scheduled_at, duration_minutes, status, meeting_link, meeting_url, meeting_provider, meeting_room_id, meeting_expires_at, needs_manual_intervention, notes, created_at, updated_at, NOW()
      FROM moved
      RETURNING id;
    `;

    try {
      const { rowCount } = await pool.query(moveQuery, [years]);
      const moved = rowCount ?? 0;
      if (moved > 0) {
        logger.info("SessionModel: archived old sessions", { years, moved });
      }
      return moved;
    } catch (error) {
      logger.error("Failed to archive old sessions:", error);
      return 0;
    }
  },
};

export default SessionModel;
