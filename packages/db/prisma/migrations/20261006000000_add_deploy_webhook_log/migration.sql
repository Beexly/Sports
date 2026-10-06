-- CreateTable
CREATE TABLE IF NOT EXISTS "deploy_webhook_logs" (
    "id" TEXT NOT NULL,
    "env" TEXT NOT NULL,
    "prNumber" INTEGER,
    "requiredChecksOk" BOOLEAN NOT NULL DEFAULT false,
    "deployedAt" TIMESTAMP(3),
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deploy_webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "deploy_webhook_logs_env_createdAt_idx" ON "deploy_webhook_logs"("env", "createdAt");
