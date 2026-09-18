-- AlterTable
ALTER TABLE "Host" ADD COLUMN     "clusterMitglieder" TEXT[] DEFAULT ARRAY[]::TEXT[];
