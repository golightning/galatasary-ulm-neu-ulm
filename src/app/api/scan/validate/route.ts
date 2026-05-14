import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { verifyQRToken } from "@/lib/qr";
import { isMemberValid } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { allowed } = await rateLimit(`scan:${session.user.id}`, 60);
  if (!allowed) {
    return NextResponse.json({ error: "Zu viele Anfragen" }, { status: 429 });
  }

  const body = await req.json();
  const { qrData } = body;

  if (!qrData || typeof qrData !== "string") {
    return NextResponse.json({ error: "Ungültige QR-Daten" }, { status: 400 });
  }

  // QR-Token verifizieren
  const verified = await verifyQRToken(qrData);
  if (!verified) {
    // Log invalid scan
    await prisma.scanLog.create({
      data: {
        result: "invalid",
        scannedByAdminId: session.user.id,
      },
    });

    return NextResponse.json({
      valid: false,
      result: "invalid",
      message: "Ungültiger QR-Code",
    });
  }

  // Mitglied anhand passId suchen
  const member = await prisma.member.findUnique({
    where: { passId: verified.passId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      memberNumber: true,
      memberType: true,
      status: true,
      expiryDate: true,
      // photoUrl bewusst ausgeschlossen — Scan-Seite lädt Foto via /api/members/:id/photo
    },
  });

  if (!member) {
    await prisma.scanLog.create({
      data: {
        result: "invalid",
        scannedByAdminId: session.user.id,
      },
    });

    return NextResponse.json({
      valid: false,
      result: "invalid",
      message: "Mitglied nicht gefunden",
    });
  }

  // Gültigkeit prüfen
  const validation = isMemberValid(member);

  // Scan loggen
  await prisma.scanLog.create({
    data: {
      memberId: member.id,
      result: validation.reason,
      scannedByAdminId: session.user.id,
    },
  });

  return NextResponse.json({
    valid: validation.valid,
    result: validation.reason,
    message: validation.valid
      ? "Mitglied ist gültig"
      : validation.reason === "expired"
        ? "Mitgliedschaft abgelaufen"
        : validation.reason === "blocked"
          ? "Mitglied ist gesperrt"
          : "Mitglied ist nicht aktiv",
    member: {
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      memberNumber: member.memberNumber,
      memberType: member.memberType,
    },
  });
}
