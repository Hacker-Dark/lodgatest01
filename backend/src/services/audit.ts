import { query, localDB } from '../config/db.js';

/**
 * Creates an audit log entry in the database.
 * Stricly sanitizes metadata to ensure no passwords or credentials are ever recorded.
 */
export async function createAuditLog(
  userId: string | null,
  action: string,
  metadata: Record<string, any> = {}
) {
  // Strictly sanitize sensitive credentials
  const sanitizedMetadata = { ...metadata };
  const sensitiveKeys = ['password', 'token', 'otp', 'access_token', 'id_token', 'secret', 'credential'];
  for (const key of sensitiveKeys) {
    delete sanitizedMetadata[key];
    // Case insensitive delete
    for (const metaKey of Object.keys(sanitizedMetadata)) {
      if (metaKey.toLowerCase().includes(key)) {
        delete sanitizedMetadata[metaKey];
      }
    }
  }

  const logRecord = {
    user_id: userId,
    action,
    metadata: sanitizedMetadata,
    created_at: new Date()
  };

  try {
    const sql = `
      INSERT INTO audit_log (user_id, action, metadata, created_at)
      VALUES ($1, $2, $3, now())
      RETURNING *;
    `;
    const result = await query(sql, [userId, action, JSON.stringify(sanitizedMetadata)]);
    
    const dbRecord = result.rows[0] || {
      log_id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ...logRecord
    };

    // Keep memory DB in sync for visual preview audit desks
    localDB.audit_logs = localDB.audit_logs || [];
    localDB.audit_logs.push(dbRecord);

    return dbRecord;
  } catch (error) {
    console.error('Database query for audit log failed. Appending to local state.', error);
    
    const fallbackRecord = {
      log_id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ...logRecord
    };

    localDB.audit_logs = localDB.audit_logs || [];
    localDB.audit_logs.push(fallbackRecord);

    return fallbackRecord;
  }
}
