-- AlterTable
ALTER TABLE "users" ADD COLUMN "calendar_token" TEXT,
ADD COLUMN "calendar_token_created_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "users_calendar_token_key" ON "users"("calendar_token");
