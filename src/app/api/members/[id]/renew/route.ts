import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { renewMemberSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

interface Context {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, ctx: Context) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = renewMemberSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validierungsfehler", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const member = await prisma.member.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!member) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  if (member.status === "blocked") {
    return NextResponse.json(
      { error: "Gesperrte Mitglieder können nicht verlängert werden" },
      { status: 400 }
    );
  }

  const updated = await prisma.member.update({
    where: { id },
    data: {
      expiryDate: new Date(parsed.data.newExpiryDate),
      status: "active",
    },
    select: {
      id: true, memberNumber: true, firstName: true, lastName: true,
      status: true, expiryDate: true,
    },
  });

  await logAudit({
    adminId: session.user!.id!,
    action: "renew",
    entity: "member",
    entityId: id,
    details: `Verlängert bis ${parsed.data.newExpiryDate}`,
  });

  return NextResponse.json(updated);
}
