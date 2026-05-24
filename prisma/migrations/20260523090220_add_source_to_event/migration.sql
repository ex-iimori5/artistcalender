-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "artistId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "venue" TEXT NOT NULL,
    "url" TEXT,
    "source" TEXT NOT NULL DEFAULT 'unknown',
    "cachedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Event_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Event" ("artistId", "cachedAt", "date", "eventType", "id", "title", "url", "venue") SELECT "artistId", "cachedAt", "date", "eventType", "id", "title", "url", "venue" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
