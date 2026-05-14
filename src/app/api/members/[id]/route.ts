import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { updateMemberSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: Context) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { id } = await ctx.params;
  const member = await prisma.member.findUnique({
    where: { id },
    select: {
      id: true, memberNumber: true, firstName: true, lastName: true,
      email: true, memberType: true, status: true,
      joinDate: true, expiryDate: true, passId: true,
      createdAt: true, updatedAt: true,
    },
  });
  if (!member) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  return NextResponse.json(member);
}

export async function PATCH(req: NextRequest, ctx: Context) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = updateMemberSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validierungsfehler", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.member.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const member = await prisma.member.update({
    where: { id },
    data: parsed.data,
    select: {
      id: true, memberNumber: true, firstName: true, lastName: true,
      email: true, memberType: true, status: true,
      joinDate: true, expiryDate: true, createdAt: true,
    },
  });

  await logAudit({
    adminId: session.user!.id!,
    action: "update",
    entity: "member",
    entityId: id,
    details: `Felder aktualisiert: ${Object.keys(parsed.data).join(", ")}`,
  });

  return NextResponse.json(member);
}

export async function DELETE(_req: NextRequest, ctx: Context) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { id } = await ctx.params;
  const member = await prisma.member.findUnique({
    where: { id },
    select: { id: true, memberNumber: true, firstName: true, lastName: true },
  });
  if (!member) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  // Audit-Log vor dem Löschen erstellen, damit entityId noch referenziert wird
  await logAudit({
    adminId: session.user!.id!,
    action: "delete",
    entity: "member",
    entityId: id,
    details: `${member.memberNumber} – ${member.firstName} ${member.lastName}`,
  });

  await prisma.member.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
