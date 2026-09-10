-- AlterTable
ALTER TABLE "Incident" ADD COLUMN "openMonitorId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Incident_openMonitorId_key" ON "Incident"("openMonitorId");
