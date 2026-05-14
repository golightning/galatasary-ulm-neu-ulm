import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createMemberSchema } from "@/lib/validations";
import { generateMemberNumber } from "@/lib/utils";
import { logAudit } from "@/lib/audit";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const take = Math.min(parseInt(searchParams.get("limit") || "100", 10) || 100, 200);
  const skip = Math.max(0, parseInt(searchParams.get("offset") || "0", 10) || 0);

  const [members, total] = await Promise.all([
    prisma.member.findMany({
      orderBy: { createdAt: "desc" },
      take,
      skip,
      select: {
        id: true,
        memberNumber: true,
        firstName: true,
        lastName: true,
        email: true,
        memberType: true,
        status: true,
        joinDate: true,
        expiryDate: true,
        createdAt: true,
      },
    }),
    prisma.member.count(),
  ]);

  return NextResponse.json({ members, total, limit: take, offset: skip });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await req.json();
  const parsed = createMemberSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validierungsfehler", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const suffix = parsed.data.memberNumberSuffix?.trim();
  const memberNumber = suffix
    ? `GS-${suffix.padStart(4, "0")}`
    : await generateMemberNumber();

  // Doppelte Mitgliedsnummer verhindern
  const existing = await prisma.member.findUnique({ where: { memberNumber }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ error: `Mitgliedsnummer ${memberNumber} ist bereits vergeben` }, { status: 409 });
  }

  let member;
  try {
    member = await prisma.member.create({
      data: {
        memberNumber,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        memberType: parsed.data.memberType,
        joinDate: new Date(parsed.data.joinDate),
        expiryDate: new Date(parsed.data.expiryDate),
        status: "active",
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: `Mitgliedsnummer ${memberNumber} ist bereits vergeben` }, { status: 409 });
    }
    throw err;
  }

  await logAudit({
    adminId: session.user!.id!,
    action: "create",
    entity: "member",
    entityId: member.id,
    details: `Mitglied ${memberNumber} erstellt`,
  });

  return NextResponse.json(member, { status: 201 });
}
