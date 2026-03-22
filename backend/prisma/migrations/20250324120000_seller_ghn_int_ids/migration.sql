-- GHN master IDs (Int) per seller warehouse; drop legacy TEXT province/district codes.
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "seller_province_id" INTEGER;
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "seller_district_id" INTEGER;

UPDATE "seller_profiles"
SET
  "seller_province_id" = CASE
    WHEN "seller_province_code" IS NOT NULL AND trim("seller_province_code") ~ '^[0-9]+$'
    THEN CAST(trim("seller_province_code") AS INTEGER)
    ELSE NULL
  END,
  "seller_district_id" = CASE
    WHEN "seller_district_code" IS NOT NULL AND trim("seller_district_code") ~ '^[0-9]+$'
    THEN CAST(trim("seller_district_code") AS INTEGER)
    ELSE NULL
  END;

ALTER TABLE "seller_profiles" DROP COLUMN IF EXISTS "seller_province_code";
ALTER TABLE "seller_profiles" DROP COLUMN IF EXISTS "seller_district_code";
