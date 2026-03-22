-- Denormalized GHN province label for shop card / listing (updated when seller saves warehouse)
ALTER TABLE "seller_profiles" ADD COLUMN "seller_province_name" TEXT;
