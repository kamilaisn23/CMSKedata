-- Additive migration: existing users, sessions, and sites are preserved.
CREATE TABLE IF NOT EXISTS "SiteMembership" (
    "userId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    PRIMARY KEY ("userId", "siteId"),
    CONSTRAINT "SiteMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SiteMembership_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "SiteMembership_siteId_idx" ON "SiteMembership"("siteId");
