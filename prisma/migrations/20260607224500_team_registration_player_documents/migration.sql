CREATE TYPE "TeamRegistrationPlayerDocumentStatus" AS ENUM ('MISSING', 'UPLOADED', 'PAPER_DELIVERY');

ALTER TABLE "TeamRegistrationPlayer"
ADD COLUMN     "documentStatus" "TeamRegistrationPlayerDocumentStatus" NOT NULL DEFAULT 'MISSING',
ADD COLUMN     "documentFilePath" TEXT,
ADD COLUMN     "documentFileName" TEXT,
ADD COLUMN     "documentMimeType" TEXT,
ADD COLUMN     "documentSizeBytes" INTEGER,
ADD COLUMN     "documentUploadedAt" TIMESTAMP(3),
ADD COLUMN     "documentMarkedPaperAt" TIMESTAMP(3);
