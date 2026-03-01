-- Add keyLookupHash column to api_keys for O(1) lookup without N+1 bcrypt loop
-- Existing rows get a NULL placeholder; they will be invalidated (users must re-create keys).
-- The column is NOT NULL with a temporary default to handle the ALTER in one step,
-- then the default is dropped so new rows must always supply the value.

ALTER TABLE "api_keys" ADD COLUMN "key_lookup_hash" TEXT;

-- Back-fill existing rows with a sentinel value so we can then set NOT NULL.
-- Existing keys become permanently invalid because their lookup hash won't match
-- any presented token (the sentinel is not a valid SHA-256 of a real key).
UPDATE "api_keys" SET "key_lookup_hash" = 'invalidated-' || id WHERE "key_lookup_hash" IS NULL;

ALTER TABLE "api_keys" ALTER COLUMN "key_lookup_hash" SET NOT NULL;

-- Add unique constraint + index for fast lookup
CREATE UNIQUE INDEX "api_keys_key_lookup_hash_key" ON "api_keys"("key_lookup_hash");
