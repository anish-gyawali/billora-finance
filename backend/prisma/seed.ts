import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma, disconnectDatabase } from "../src/lib/prisma.js";
import { UserRole } from "../src/generated/prisma/enums.js";
import { env } from "../src/config/env.js";
import { accountService } from "../src/modules/accounts/account.service.js";

// Extract credentials dynamically from environment variables
const founderEmail =
  process.env.Founder_mail ||
  process.env.FOUNDER_EMAIL ||
  process.env.FOUNDER_MAIL;

const founderPassword =
  process.env.FOunder_password ||
  process.env.Founder_password ||
  process.env.FOUNDER_PASSWORD;

const accountantEmail =
  process.env.Accountant_mail ||
  process.env.ACCOUNTANT_EMAIL ||
  process.env.ACCOUNTANT_MAIL;

const accountantPassword =
  process.env.Accountant_password ||
  process.env.ACCOUNTANT_PASSWORD;

const memberEmail =
  process.env.Member_mail ||
  process.env.MEMBER_EMAIL ||
  process.env.MEMBER_MAIL;

const memberPassword =
  process.env.Member_password ||
  process.env.MEMBER_PASSWORD;

if (!founderEmail || !founderPassword) {
  throw new Error(
    "Missing Founder credentials in environment variables (Founder_mail, FOunder_password)"
  );
}

if (!accountantEmail || !accountantPassword) {
  throw new Error(
    "Missing Accountant credentials in environment variables (Accountant_mail, Accountant_password)"
  );
}

if (!memberEmail || !memberPassword) {
  throw new Error(
    "Missing Member credentials in environment variables (Member_mail, Member_password)"
  );
}

interface SeedUser {
  email: string;
  name: string;
  role: UserRole;
  plainPassword: string;
  bankAccountNumber: string;
  panNumber?: string;
  monthlySalary?: number;
}

const seedUsers: SeedUser[] = [
  {
    email: founderEmail,
    name: "Founder Admin",
    role: UserRole.founder,
    plainPassword: founderPassword,
    bankAccountNumber: "1234567890123",
    panNumber: "100200300",
    monthlySalary: 150000,
  },
  {
    email: accountantEmail,
    name: "Senior Accountant",
    role: UserRole.accountant,
    plainPassword: accountantPassword,
    bankAccountNumber: "2345678901234",
    panNumber: "200300400",
    monthlySalary: 85000,
  },
  {
    email: memberEmail,
    name: "Standard Member",
    role: UserRole.member,
    plainPassword: memberPassword,
    bankAccountNumber: "3456789012345",
    panNumber: "300400500",
    monthlySalary: 50000,
  },
];

async function seed() {
  console.log("🌱 Starting database seeding from environment variables...\n");

  const saltRounds = env.BCRYPT_SALT_ROUNDS || 12;

  for (const userDef of seedUsers) {
    const passwordHash = await bcrypt.hash(userDef.plainPassword, saltRounds);

    const user = await prisma.user.upsert({
      where: { email: userDef.email },
      update: {
        name: userDef.name,
        role: userDef.role,
        password_hash: passwordHash,
        bank_account_number: userDef.bankAccountNumber,
        pan_number: userDef.panNumber ?? null,
        is_active: true,
        monthly_salary: userDef.monthlySalary ?? null,
      },
      create: {
        email: userDef.email,
        name: userDef.name,
        role: userDef.role,
        password_hash: passwordHash,
        bank_account_number: userDef.bankAccountNumber,
        pan_number: userDef.panNumber ?? null,
        is_active: true,
        monthly_salary: userDef.monthlySalary ?? null,
      },
    });

    console.log(`✅ [${user.role.toUpperCase()}] Seeded user: ${user.email} (ID: ${user.id})`);
  }

  const coa = await accountService.seedStarterCOA();
  console.log(`Seeded ${coa.seededCount} new chart-of-accounts records (27 configured).`);

  console.log("\n🎉 Seeding completed successfully!");
  console.log("\nSeeded accounts summary:");
  console.log("----------------------------------------------------------------");
  for (const user of seedUsers) {
    console.log(`Role: ${user.role.padEnd(10)} | Email: ${user.email.padEnd(25)} | Password: [CONFIGURED IN .ENV]`);
  }
  console.log("----------------------------------------------------------------\n");
}

seed()
  .catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectDatabase();
  });
