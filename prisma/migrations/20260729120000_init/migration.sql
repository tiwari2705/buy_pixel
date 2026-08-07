-- Initial PostgreSQL schema for sayitlpu.online

CREATE TYPE "BlockStatus" AS ENUM ('reserved', 'pending_review', 'live', 'rejected');
CREATE TYPE "PaymentStatus" AS ENUM ('created', 'captured', 'failed', 'refunded');

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "blocks" (
  "id" TEXT NOT NULL,
  "order_id" TEXT,
  "x" INTEGER NOT NULL,
  "y" INTEGER NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "buyer_name" TEXT NOT NULL,
  "buyer_email" TEXT NOT NULL,
  "link_url" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "image_url" TEXT NOT NULL,
  "image_width" INTEGER NOT NULL,
  "image_height" INTEGER NOT NULL,
  "status" "BlockStatus" NOT NULL DEFAULT 'reserved',
  "reserved_until" TIMESTAMP(3),
  "rejection_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approved_at" TIMESTAMP(3),
  CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "block_cells" (
  "id" TEXT NOT NULL,
  "block_id" TEXT NOT NULL,
  "x" INTEGER NOT NULL,
  "y" INTEGER NOT NULL,
  CONSTRAINT "block_cells_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payments" (
  "id" TEXT NOT NULL,
  "block_id" TEXT NOT NULL,
  "razorpay_order_id" TEXT NOT NULL,
  "razorpay_payment_id" TEXT,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "status" "PaymentStatus" NOT NULL DEFAULT 'created',
  "raw_payload" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clicks" (
  "id" TEXT NOT NULL,
  "block_id" TEXT NOT NULL,
  "ip_hash" TEXT,
  "referrer" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "clicks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contact_messages" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "ip_hash" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "webhook_events" (
  "id" TEXT NOT NULL,
  "event_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "blocks_order_id_key" ON "blocks"("order_id");
CREATE INDEX "blocks_status_idx" ON "blocks"("status");
CREATE INDEX "blocks_reserved_until_idx" ON "blocks"("reserved_until");
CREATE UNIQUE INDEX "block_cells_x_y_key" ON "block_cells"("x", "y");
CREATE INDEX "block_cells_block_id_idx" ON "block_cells"("block_id");
CREATE UNIQUE INDEX "payments_razorpay_order_id_key" ON "payments"("razorpay_order_id");
CREATE UNIQUE INDEX "payments_razorpay_payment_id_key" ON "payments"("razorpay_payment_id");
CREATE INDEX "payments_block_id_idx" ON "payments"("block_id");
CREATE INDEX "clicks_block_id_idx" ON "clicks"("block_id");
CREATE UNIQUE INDEX "webhook_events_event_id_key" ON "webhook_events"("event_id");

ALTER TABLE "block_cells" ADD CONSTRAINT "block_cells_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
