import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";

if (process.env.NODE_ENV === "production") {
  console.error("Seed script cannot run in production.");
  process.exit(1);
}

const prisma = new PrismaClient();

function generateUniqueId(
  provider: string,
  socialId: string,
  email: string,
): string {
  const salt = process.env.HALO_ID_SALT || "dev-salt-for-seeding";
  const input = `${salt}:${provider}:${socialId}:${email}`;
  return "0x" + createHash("sha256").update(input).digest("hex");
}

async function main() {
  console.log("Seeding database...");

  const users = [];
  for (let i = 1; i <= 5; i++) {
    const email = `testuser${i}@halo.dev`;
    const uniqueId = generateUniqueId("github", `seed-${i}`, email);
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: `Test User ${i}`,
        socialProvider: "github",
        socialId: `seed-${i}`,
        uniqueId,
        walletAddress: `ST${i}SEEDWALLET${"0".repeat(26)}`.slice(0, 41),
        status: "active",
        walletBoundAt: new Date(),
      },
    });
    users.push(user);
  }
  console.log(`Created ${users.length} test users`);

  const circle = await prisma.circle.create({
    data: {
      creatorId: users[0].id,
      name: "Seed Test Circle",
      contributionAmount: BigInt(10_000_000),
      totalMembers: 3,
      roundDuration: 144,
      gracePeriod: 72,
      tokenType: 0,
      inviteCode: "SEEDTEST",
      status: "forming",
    },
  });

  for (let i = 0; i < 3; i++) {
    await prisma.circleMember.create({
      data: {
        circleId: circle.id,
        userId: users[i].id,
        payoutPosition: i + 1,
        status: "confirmed",
        joinedAt: new Date(),
      },
    });
  }
  console.log(`Created circle "${circle.name}" with 3 members`);

  for (const user of users) {
    await prisma.creditScore.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        uniqueId: user.uniqueId,
        score: 300 + Math.floor(Math.random() * 200),
      },
    });
  }
  console.log("Created credit scores");
  console.log("Seeding complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
