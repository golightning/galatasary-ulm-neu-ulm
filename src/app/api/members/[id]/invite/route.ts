import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendInviteEmail } from "@/lib/email";
import { isMemberValid } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";
import crypto from "crypto";

interface Context {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, ctx: Context) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { id } = await ctx.params;

  // Max. 3 Einladungen pro Mitglied pro Minute – verhindert Resend-Spam bei kompromittierter Session
  const { allowed } = await rateLimit(`invite:${id}`, 3);
  if (!allowed) {
    return NextResponse.json({ error: "Zu viele Anfragen. Bitte kurz warten." }, { status: 429 });
  }

  const member = await prisma.member.findUnique({
    where: { id },
    select: { id: true, email: true, firstName: true, lastName: true, status: true, expiryDate: true },
  });
  if (!member) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const validation = isMemberValid(member);
  if (!validation.valid) {
    return NextResponse.json(
      { error: "Einladung nicht möglich: Mitgliedschaft ist nicht aktiv." },
      { status: 400 }
    );
  }

  // Claim-Token erstellen (7 Tage gültig)
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Vorherige, nicht eingelöste Tokens invalidieren und neuen Token atomar erstellen.
  // $transaction stellt sicher, dass kein Zwischenzustand entstehen kann (deleteMany
  // erfolgreich, create schlägt fehl → Mitglied ohne aktiven Token).
  await prisma.$transaction([
    prisma.claimToken.deleteMany({
      where: { memberId: member.id, claimedAt: null },
    }),
    prisma.claimToken.create({
      data: {
        token,
        memberId: member.id,
        expiresAt,
      },
    }),
  ]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    console.error("[invite] NEXT_PUBLIC_APP_URL ist nicht gesetzt");
    return NextResponse.json({ error: "Serverkonfigurationsfehler" }, { status: 500 });
  }
  const claimUrl = `${appUrl}/wallet/claim/${token}`;

  // E-Mail senden
  let mailStatus = "sent";
  let mailError: string | undefined;

  try {
    await sendInviteEmail({
      to: member.email,
      memberName: `${member.firstName} ${member.lastName}`,
      claimUrl,
    });
  } catch (err) {
    mailStatus = "failed";
    mailError = err instanceof Error ? err.message : "Unbekannter Fehler";
  }

  // Mail-Log
  await prisma.mailLog.create({
    data: {
      memberId: member.id,
      type: "invite",
      to: member.email,
      subject: "Digitaler Mitgliedsausweis",
      status: mailStatus,
      error: mailError,
    },
  });

  if (mailStatus === "failed") {
    return NextResponse.json({ error: "E-Mail konnte nicht gesendet werden" }, { status: 500 });
  }

  return NextResponse.json({ success: true, claimUrl });
}
