-- AlterTable
ALTER TABLE "blocks" ALTER COLUMN "buyer_name" DROP NOT NULL,
ALTER COLUMN "buyer_email" DROP NOT NULL,
ALTER COLUMN "link_url" DROP NOT NULL,
ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "image_url" DROP NOT NULL,
ALTER COLUMN "image_width" DROP NOT NULL,
ALTER COLUMN "image_height" DROP NOT NULL;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "buyer_data" JSONB;
