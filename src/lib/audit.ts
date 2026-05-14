import { prisma } from "@/lib/prisma";

export async function logAudit(params: {
  adminId: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
}) {
  try {
    await prisma.auditLog.create({ data: params });
  } catch (err) {
    console.error("[audit] Fehler beim Schreiben des Audit-Logs:", err);
  }
}
