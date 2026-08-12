-- AlterTable
ALTER TABLE "User" ADD COLUMN     "learningStyle" TEXT NOT NULL DEFAULT 'Visual Learner',
ADD COLUMN     "processingSpeed" TEXT NOT NULL DEFAULT 'Average',
ADD COLUMN     "readingSpeed" TEXT NOT NULL DEFAULT 'Average',
ADD COLUMN     "workingMemory" TEXT NOT NULL DEFAULT 'Average';

-- CreateTable
CREATE TABLE "TopicContent" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "learnText" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "examples" TEXT NOT NULL,
    "formula" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopicContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiChatMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TopicContent_topicId_key" ON "TopicContent"("topicId");

-- AddForeignKey
ALTER TABLE "TopicContent" ADD CONSTRAINT "TopicContent_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiChatMessage" ADD CONSTRAINT "AiChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
