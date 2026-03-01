-- AlterTable
ALTER TABLE "webhook_logs" ADD COLUMN "delivery_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "webhook_logs_delivery_id_key" ON "webhook_logs"("delivery_id");
