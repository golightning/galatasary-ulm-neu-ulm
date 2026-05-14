import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
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
    select: { photoUrl: true },
  });
  if (!member) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  if (!member.photoUrl) return new NextResponse(null, { status: 204 });

  // Parse stored data URL: "data:image/jpeg;base64,..."
  const match = member.photoUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return NextResponse.json({ error: "Ungültiges Fotoformat" }, { status: 500 });

  const [, mimeType, base64] = match;
  const buffer = Buffer.from(base64, "base64");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

export async function POST(req: NextRequest, ctx: Context) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { id } = await ctx.params;
  const member = await prisma.member.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!member) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  // Content-Length-Pre-Check: schnelles Fail vor dem Body-Parse,
  // um nicht einen 50MB-Buffer im Speicher aufzubauen, bevor der 413 kommt.
  // Der Wert ist client-gesteuert und nicht authentizitätsgarantierend, aber
  // ausreichend für ehrliche Clients und reduziert serverseitige Ressourcenlast.
  const contentLength = parseInt(req.headers.get("content-length") ?? "0", 10);
  if (contentLength > 5.5 * 1024 * 1024) {
    return NextResponse.json({ error: "Datei zu groß (max 5MB)" }, { status: 413 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file || !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Ungültige Datei" }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Datei zu groß (max 5MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Magic-Byte Validation: Prüfe tatsächlichen Dateityp anhand der ersten Bytes
  // und leite den MIME-Type daraus ab (nicht aus file.type, das client-kontrolliert ist)
  const MAGIC_BYTES: Array<{ mimeType: string; signature: number[] }> = [
    { mimeType: "image/jpeg", signature: [0xff, 0xd8, 0xff] },
    { mimeType: "image/png",  signature: [0x89, 0x50, 0x4e, 0x47] },
    { mimeType: "image/gif",  signature: [0x47, 0x49, 0x46, 0x38] },
    { mimeType: "image/webp", signature: [0x52, 0x49, 0x46, 0x46] }, // RIFF header
  ];

  const detectedMimeType = MAGIC_BYTES.find(({ signature }) =>
    signature.every((byte, i) => buffer[i] === byte)
  )?.mimeType;

  if (!detectedMimeType) {
    return NextResponse.json(
      { error: "Ungültiges Bildformat. Erlaubt: JPEG, PNG, GIF, WebP" },
      { status: 400 }
    );
  }

  const base64 = buffer.toString("base64");
  const dataUrl = `data:${detectedMimeType};base64,${base64}`;

  await prisma.member.update({
    where: { id },
    data: { photoUrl: dataUrl },
    select: { id: true },
  });

  await logAudit({
    adminId: session.user!.id!,
    action: "photo_upload",
    entity: "member",
    entityId: id,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, ctx: Context) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { id } = await ctx.params;
  const member = await prisma.member.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!member) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  await prisma.member.update({
    where: { id },
    data: { photoUrl: null },
    select: { id: true },
  });

  await logAudit({
    adminId: session.user!.id!,
    action: "photo_delete",
    entity: "member",
    entityId: id,
  });

  return new NextResponse(null, { status: 204 });
}
