import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import crypto from "crypto";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  const member = await prisma.member.findFirst({ where: { memberNumber: "GS-0001" } });
  if (!member) { console.log("Kein Mitglied gefunden"); process.exit(1); }

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.claimToken.create({
    data: {
      token,
      memberId: member.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });

  console.log("\nClaim-Link (24h gültig):");
  console.log("http://localhost:3000/wallet/claim/" + token + "\n");
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); process.exit(1); });
