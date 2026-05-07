-- Reconcile Better Auth schema drift without resetting auth data.

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "image" TEXT;

ALTER TABLE "Session"
ADD COLUMN IF NOT EXISTS "token" TEXT,
ADD COLUMN IF NOT EXISTS "ipAddress" TEXT,
ADD COLUMN IF NOT EXISTS "userAgent" TEXT,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'Session'
          AND column_name = 'refreshTokenHash'
    ) THEN
        UPDATE "Session"
        SET "token" = "refreshTokenHash"
        WHERE "token" IS NULL
          AND "refreshTokenHash" IS NOT NULL;
    END IF;
END $$;

DELETE FROM "Session" WHERE "token" IS NULL;

ALTER TABLE "Session"
ALTER COLUMN "token" SET NOT NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'Session'
          AND column_name = 'refreshTokenHash'
    ) THEN
        ALTER TABLE "Session"
        ALTER COLUMN "refreshTokenHash" DROP NOT NULL;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Session_token_key" ON "Session"("token");

CREATE TABLE IF NOT EXISTS "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "idToken" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");

CREATE TABLE IF NOT EXISTS "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);
