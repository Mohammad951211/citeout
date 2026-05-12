-- CreateEnum
CREATE TYPE "ToolType" AS ENUM ('TRANSLATE', 'PARAPHRASE', 'AI_DETECT', 'GRAMMAR', 'HUMANIZE');

-- CreateTable
CREATE TABLE "ResearchToolUsage" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "toolType"  "ToolType" NOT NULL,
    "inputText" TEXT NOT NULL,
    "output"    TEXT NOT NULL,
    "metadata"  JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchToolUsage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ResearchToolUsage"
  ADD CONSTRAINT "ResearchToolUsage_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
