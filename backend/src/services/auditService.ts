import prisma from '../config/db.js';

export interface AuditParams {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  details?: any;
}

export const recordAuditLog = async (params: AuditParams) => {
  try {
    return await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId || null,
        ipAddress: params.ipAddress || null,
        details: params.details ? JSON.stringify(params.details) : null,
      },
    });
  } catch (err) {
    console.warn('Audit logging failed:', err);
  }
};
