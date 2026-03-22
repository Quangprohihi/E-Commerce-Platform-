-- Seller warehouse district/ward (3PL master data codes)
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "seller_district_code" TEXT;
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "seller_ward_code" TEXT;

-- Buyer delivery district/ward on order
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "buyer_district_code" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "buyer_ward_code" TEXT;
