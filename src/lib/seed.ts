
import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import argon2 from "argon2";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

export const prisma = new PrismaClient({ adapter });

const users = [
  {
    id: "usr_001",
    email: "alice@example.com",
    password: "Password123!",
    profile: {
      fullName: "Alice Nakamura",
      displayName: "alice",
      bio: "Product designer who likes clean UIs.",
      createdAt: "2025-01-14T09:32:00Z",
      role: "user",
    },
    files: [
      {
        id: "file_001",
        ownerId: "usr_001",
        fileName: "resume_alice.pdf",
        mimeType: "application/pdf",
        sizeBytes: 84213,
        uploadedAt: "2025-01-15T10:02:00Z",
      },
      {
        id: "file_002",
        ownerId: "usr_001",
        fileName: "profile_photo.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 231044,
        uploadedAt: "2025-01-16T14:20:00Z",
      },
    ],
  },

  {
    id: "usr_002",
    email: "bob@example.com",
    password: "Password123!",
    profile: {
      fullName: "Bob Alvarez",
      displayName: "bob",
      bio: "Backend engineer, coffee enthusiast.",
      createdAt: "2025-02-02T11:15:00Z",
      role: "user",
    },
    files: [
      {
        id: "file_003",
        ownerId: "usr_002",
        fileName: "project_notes.txt",
        mimeType: "text/plain",
        sizeBytes: 5210,
        uploadedAt: "2025-02-03T09:40:00Z",
      },
      {
        id: "file_004",
        ownerId: "usr_002",
        fileName: "invoice_march.pdf",
        mimeType: "application/pdf",
        sizeBytes: 62890,
        uploadedAt: "2025-03-01T08:05:00Z",
      },
    ],
  },

  {
    id: "usr_003",
    email: "carol@example.com",
    password: "Password123!",
    profile: {
      fullName: "Carol Whitfield",
      displayName: "carol",
      bio: "QA lead focused on security testing.",
      createdAt: "2025-03-10T16:48:00Z",
      role: "user",
    },
    files: [
      {
        id: "file_005",
        ownerId: "usr_003",
        fileName: "test_plan.docx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        sizeBytes: 41200,
        uploadedAt: "2025-03-11T12:30:00Z",
      },
      {
        id: "file_006",
        ownerId: "usr_003",
        fileName: "vacation.png",
        mimeType: "image/png",
        sizeBytes: 512300,
        uploadedAt: "2025-04-02T18:00:00Z",
      },
    ],
  },
];

async function main() {
  console.log("Seeding database...");

  for (const seedUser of users) {
    const passwordHash = await argon2.hash(seedUser.password);

    await prisma.user.upsert({
      where: {
        id: seedUser.id,
      },
      update: {
        email: seedUser.email,
        passwordHash,
        fullName: seedUser.profile.fullName,
        displayName: seedUser.profile.displayName,
        bio: seedUser.profile.bio,
        role: seedUser.profile.role,
        createdAt: new Date(seedUser.profile.createdAt),
      },
      create: {
        id: seedUser.id,
        email: seedUser.email,
        passwordHash,
        fullName: seedUser.profile.fullName,
        displayName: seedUser.profile.displayName,
        bio: seedUser.profile.bio,
        role: seedUser.profile.role,
        createdAt: new Date(seedUser.profile.createdAt),
      },
    });

    for (const file of seedUser.files) {
      await prisma.file.upsert({
        where: {
          id: file.id,
        },
        update: {
          ownerId: file.ownerId,
          fileName: file.fileName,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
          uploadedAt: new Date(file.uploadedAt),
        },
        create: {
          id: file.id,
          ownerId: file.ownerId,
          fileName: file.fileName,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
          uploadedAt: new Date(file.uploadedAt),
        },
      });
    }

    console.log(`Seeded ${seedUser.email}`);
  }

  console.log("Database seeded successfully.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
