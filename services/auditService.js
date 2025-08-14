const db = require('../database/connection');

const logAuthAttempt = async (auditData) => {
    const { userId, action, ipAddress, userAgent, success, details } = auditData;
    
    try {
        const insertAudit = db.prepare(`
            INSERT INTO auth_audit_log (user_id, action, ip_address, user_agent, success, details)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        insertAudit.run(
            userId || null,
            action,
            ipAddress || null,
            userAgent || null,
            success,
            details || null
        );
    } catch (error) {
        console.error('Failed to log audit entry:', error);
        // Don't throw error as audit logging failure shouldn't break auth flow
    }
};

const getAuditLogs = (userId, limit = 50) => {
    try {
        const query = db.prepare(`
            SELECT action, ip_address, user_agent, success, details, created_at
            FROM auth_audit_log 
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        `);
        
        return query.all(userId, limit);
    } catch (error) {
        console.error('Failed to retrieve audit logs:', error);
        return [];
    }
};

const cleanupOldAuditLogs = (daysToKeep = 90) => {
    try {
        const deleteOld = db.prepare(`
            DELETE FROM auth_audit_log 
            WHERE created_at < datetime('now', '-' || ? || ' days')
        `);
        
        const result = deleteOld.run(daysToKeep);
        console.log(`Cleaned up ${result.changes} old audit log entries`);
        return result.changes;
    } catch (error) {
        console.error('Failed to cleanup audit logs:', error);
        return 0;
    }
};

module.exports = {
    logAuthAttempt,
    getAuditLogs,
    cleanupOldAuditLogs
};