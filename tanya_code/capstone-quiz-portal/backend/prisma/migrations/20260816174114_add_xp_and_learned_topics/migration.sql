-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "learningStyle" TEXT NOT NULL DEFAULT 'Visual Learner',
    "readingSpeed" TEXT NOT NULL DEFAULT 'Average',
    "workingMemory" TEXT NOT NULL DEFAULT 'Average',
    "processingSpeed" TEXT NOT NULL DEFAULT 'Average',
    "theta" REAL NOT NULL DEFAULT 0.0,
    "iqScore" REAL NOT NULL DEFAULT 100.0,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "learnedTopics" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "id", "iqScore", "learningStyle", "password", "processingSpeed", "readingSpeed", "role", "theta", "updatedAt", "username", "workingMemory") SELECT "createdAt", "email", "id", "iqScore", "learningStyle", "password", "processingSpeed", "readingSpeed", "role", "theta", "updatedAt", "username", "workingMemory" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
