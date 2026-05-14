import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ClaimClient } from "@/components/wallet/claim-client";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ClaimPage({ params }: Props) {
  const { token } = await params;

  const claimToken = await prisma.claimToken.findUnique({
    where: { token },
    include: {
      member: {
        select: {
          firstName: true,
          lastName: true,
          memberNumber: true,
          memberType: true,
          status: true,
          expiryDate: true,
        },
      },
    },
  });

  if (!claimToken) notFound();

  const isExpired = claimToken.expiresAt < new Date();
  const isClaimed = !!claimToken.claimedAt;
  const isMemberActive =
    claimToken.member.status === "active" &&
    new Date(claimToken.member.expiryDate) > new Date();

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-red-50 to-orange-50 p-4">
      <ClaimClient
        token={token}
        isExpired={isExpired}
        isClaimed={isClaimed}
        isMemberActive={isMemberActive}
        member={!isExpired && !isClaimed && isMemberActive ? claimToken.member : undefined}
      />
    </div>
  );
}
