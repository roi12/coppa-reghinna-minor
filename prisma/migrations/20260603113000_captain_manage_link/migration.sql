ALTER TABLE "TeamRegistration"
ADD COLUMN     "captainManageTokenHash" TEXT,
ADD COLUMN     "captainManageTokenIssuedAt" TIMESTAMP(3),
ADD COLUMN     "captainManageTokenLastUsedAt" TIMESTAMP(3),
ADD COLUMN     "captainManageTokenRevokedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "TeamRegistration_captainManageTokenHash_key" ON "TeamRegistration"("captainManageTokenHash");
