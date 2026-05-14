import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { MemberDetail } from "@/components/members/member-detail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MemberDetailPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const member = await prisma.member.findUnique({
    where: { id },
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
      passId: true,
      createdAt: true,
      updatedAt: true,
      // photoUrl wird bewusst ausgeschlossen — wird über GET /api/members/:id/photo
      // nachgeladen um den RSC Flight Payload nicht mit bis zu 5 MB Base64 aufzublähen
      claimTokens: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, token: true, expiresAt: true, claimedAt: true, createdAt: true },
      },
      scanLogs: {
        orderBy: { scannedAt: "desc" },
        take: 10,
        select: { id: true, result: true, scannedAt: true },
      },
      mailLogs: {
        orderBy: { sentAt: "desc" },
        take: 10,
        select: { id: true, type: true, status: true, sentAt: true },
      },
    },
  });

  if (!member) notFound();

  return <MemberDetail member={member} />;
}
