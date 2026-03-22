-- Add seller province for shipping zone
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "seller_province_code" TEXT;

-- Product dimensions / weight for billable weight
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "weight_grams" INTEGER;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "package_length_cm" DECIMAL(10,2);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "package_width_cm" DECIMAL(10,2);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "package_height_cm" DECIMAL(10,2);

-- Order monetary breakdown (total_amount = final payable to buyer)
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "items_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_fee" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_discount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cod_fee" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "buyer_province_code" TEXT;

-- Backfill legacy rows: all money was item subtotal; fees were zero
UPDATE "orders"
SET
  "items_amount" = "total_amount",
  "shipping_fee" = 0,
  "shipping_discount" = 0,
  "cod_fee" = 0
WHERE "items_amount" = 0;
