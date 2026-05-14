import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateGoogleWalletLink } from "@/lib/google-wallet";
import { formatDate, isMemberValid } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";

interface Context {
  params: Promise<{ token: string }>;
}

export async function GET(_req: NextRequest, ctx: Context) {
  const { token } = await ctx.params;

  const { allowed } = await rateLimit(`wallet:${token}`, 10);
  if (!allowed) {
    return NextResponse.json({ error: "Zu viele Anfragen" }, { status: 429 });
  }

  const claimToken = await prisma.claimToken.findUnique({
    where: { token },
    include: {
      member: {
        select: {
          id: true, passId: true, memberNumber: true,
          firstName: true, lastName: true, memberType: true,
          status: true, joinDate: true, expiryDate: true,
          // photoUrl bewusst ausgeschlossen — aktuell Base64, kein https://-URL für Google Wallet nutzbar
        },
      },
    },
  });

  if (!claimToken || claimToken.expiresAt < new Date()) {
    return NextResponse.json({ error: "Token ungültig oder abgelaufen" }, { status: 404 });
  }

  // Soft-Check für UX; eigentliche Race-Condition wird weiter unten atomisch abgesichert
  if (claimToken.claimedAt) {
    return NextResponse.json({ error: "Token wurde bereits eingelöst" }, { status: 410 });
  }

  const member = claimToken.member;
  const validation = isMemberValid(member);
  if (!validation.valid) {
    return NextResponse.json({ error: "Mitgliedschaft ist nicht aktiv" }, { status: 400 });
  }

  // TOCTOU-safe: PostgreSQL UPDATE WHERE claimedAt IS NULL ist auf Statement-Ebene atomar.
  // Kein zweiter paralleler Request kann denselben Token einlösen.
  const atomicClaim = await prisma.claimToken.updateMany({
    where: { id: claimToken.id, claimedAt: null },
    data: { claimedAt: new Date() },
  });
  if (atomicClaim.count === 0) {
    return NextResponse.json({ error: "Token wurde bereits eingelöst" }, { status: 410 });
  }

  try {
    const walletLink = await generateGoogleWalletLink({
      passId: member.passId,
      memberNumber: member.memberNumber,
      firstName: member.firstName,
      lastName: member.lastName,
      memberType: member.memberType,
      joinDate: formatDate(member.joinDate),
      expiryDate: formatDate(member.expiryDate),
    });

    return NextResponse.json({ url: walletLink });
  } catch (err) {
    // Pass-Generierung fehlgeschlagen — Claim zurücksetzen, damit der Token erneut eingelöst werden kann
    await prisma.claimToken.update({
      where: { id: claimToken.id },
      data: { claimedAt: null },
    });
    console.error("Google Wallet generation error:", err);
    return NextResponse.json(
      { error: "Fehler bei der Pass-Erzeugung" },
      { status: 500 }
    );
  }
}
