ALTER TABLE "TeamRegistration"
ADD COLUMN     "gdprDocumentFilePath" TEXT,
ADD COLUMN     "gdprDocumentFileName" TEXT,
ADD COLUMN     "gdprDocumentMimeType" TEXT,
ADD COLUMN     "gdprDocumentSizeBytes" INTEGER,
ADD COLUMN     "gdprDocumentUploadedAt" TIMESTAMP(3),
ADD COLUMN     "gdprPaperDeliveryMarkedAt" TIMESTAMP(3);
