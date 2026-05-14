import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  const result = await prisma.claimToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { claimedAt: { not: null } },
      ],
    },
  });

  console.log(`✓ ${result.count} abgelaufene/eingelöste Tokens gelöscht`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
