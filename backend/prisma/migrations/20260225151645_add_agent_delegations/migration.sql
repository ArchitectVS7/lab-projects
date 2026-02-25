-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('RESEARCH', 'WRITING', 'SOCIAL_MEDIA', 'CODE', 'OUTREACH', 'ANALYTICS');

-- CreateEnum
CREATE TYPE "AgentTaskStatus" AS ENUM ('QUEUED', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "agent_delegations" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "agent_type" "AgentType" NOT NULL,
    "status" "AgentTaskStatus" NOT NULL DEFAULT 'QUEUED',
    "instructions" TEXT,
    "result" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_delegations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_delegations_task_id_idx" ON "agent_delegations"("task_id");

-- CreateIndex
CREATE INDEX "agent_delegations_user_id_idx" ON "agent_delegations"("user_id");

-- CreateIndex
CREATE INDEX "agent_delegations_user_id_agent_type_idx" ON "agent_delegations"("user_id", "agent_type");

-- AddForeignKey
ALTER TABLE "agent_delegations" ADD CONSTRAINT "agent_delegations_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_delegations" ADD CONSTRAINT "agent_delegations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
