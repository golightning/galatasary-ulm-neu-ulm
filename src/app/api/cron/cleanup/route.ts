import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Bereinigt abgelaufene und bereits eingelöste Claim-Tokens.
 * Wird täglich um 02:00 Uhr via Vercel Cron aufgerufen (vercel.json).
 *
 * Authentifizierung: Vercel setzt automatisch Authorization: Bearer <CRON_SECRET>.
 * Lokal testbar: GET /api/cron/cleanup -H "Authorization: Bearer <CRON_SECRET>"
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await prisma.claimToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { claimedAt: { not: null } },
      ],
    },
  });

  console.log(`[cron/cleanup] ${result.count} abgelaufene/eingelöste Tokens gelöscht`);
  return NextResponse.json({ deleted: result.count });
}
