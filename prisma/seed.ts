import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Admin-User erstellen
  const seedPassword = process.env.ADMIN_SEED_PASSWORD;
  if (!seedPassword) {
    throw new Error(
      "ADMIN_SEED_PASSWORD ist nicht gesetzt. Setze die Variable vor dem Seeding:\n" +
        "  ADMIN_SEED_PASSWORD=... npm run db:seed"
    );
  }
  const passwordHash = await hash(seedPassword, 12);

  await prisma.adminUser.upsert({
    where: { email: "admin@galatasaray-ulm.de" },
    update: {},
    create: {
      email: "admin@galatasaray-ulm.de",
      name: "Admin",
      passwordHash,
    },
  });

  console.log("✓ Admin-User erstellt: admin@galatasaray-ulm.de");

  // Beispiel-Mitglieder erstellen
  const members = [
    {
      memberNumber: "GS-0001",
      firstName: "Mehmet",
      lastName: "Yilmaz",
      email: "mehmet@example.com",
      memberType: "single" as const,
      status: "active" as const,
      joinDate: new Date("2024-01-15"),
      expiryDate: new Date("2027-01-15"),
    },
    {
      memberNumber: "GS-0002",
      firstName: "Ayse",
      lastName: "Kaya",
      email: "ayse@example.com",
      memberType: "family" as const,
      status: "active" as const,
      joinDate: new Date("2024-03-01"),
      expiryDate: new Date("2027-03-01"),
    },
    {
      memberNumber: "GS-0003",
      firstName: "Ali",
      lastName: "Demir",
      email: "ali@example.com",
      memberType: "sponsor" as const,
      status: "expired" as const,
      joinDate: new Date("2023-06-01"),
      expiryDate: new Date("2024-06-01"),
    },
  ];

  for (const m of members) {
    await prisma.member.upsert({
      where: { memberNumber: m.memberNumber },
      update: {},
      create: m,
    });
  }

  console.log(`✓ ${members.length} Beispiel-Mitglieder erstellt`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
