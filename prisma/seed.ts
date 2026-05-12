import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Seed only one admin account.
  const hashedPassword = await bcrypt.hash("CiteOut@Admin2026", 12);

  const admin = await prisma.user.upsert({
    where: { email: "mohammadalghweri95@gmail.com" },
    update: {
      role: "ADMIN",
      ...(process.env.SEED_ADMIN_RESET_PASSWORD === "true"
        ? { password: hashedPassword }
        : {}),
    },
    create: {
      name: "Mohammad Alghweri",
      email: "mohammadalghweri95@gmail.com",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  console.log("Seeded admin account:", admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
