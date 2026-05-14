import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

interface Context {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, ctx: Context) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { id } = await ctx.params;
  const member = await prisma.member.findUnique({
    where: { id },
    select: { id: true, status: true, expiryDate: true },
  });
  if (!member) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const newStatus = member.status === "blocked"
    ? (new Date(member.expiryDate) < new Date() ? "expired" : "active")
    : "blocked";

  const updated = await prisma.member.update({
    where: { id },
    data: { status: newStatus },
    select: { id: true, status: true, memberNumber: true, firstName: true, lastName: true },
  });

  await logAudit({
    adminId: session.user!.id!,
    action: newStatus === "blocked" ? "block" : "unblock",
    entity: "member",
    entityId: id,
  });

  return NextResponse.json(updated);
}
