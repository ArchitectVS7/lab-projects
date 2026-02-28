-- CreateEnum
CREATE TYPE "AchievementCategory" AS ENUM ('PRODUCTIVITY', 'STREAK', 'SPEED', 'ORGANIZER', 'TEAM', 'EXPLORER', 'MILESTONE', 'QUEST');

-- CreateEnum
CREATE TYPE "AchievementRarity" AS ENUM ('COMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- AlterTable
ALTER TABLE "achievements" ADD COLUMN     "category" "AchievementCategory",
ADD COLUMN     "rarity" "AchievementRarity",
ADD COLUMN     "unlock_criteria" JSONB,
ADD COLUMN     "xp_reward" INTEGER NOT NULL DEFAULT 0;
