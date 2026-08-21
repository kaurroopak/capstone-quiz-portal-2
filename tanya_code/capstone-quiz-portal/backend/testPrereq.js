const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const prereqs = await prisma.topicPrerequisite.findMany({
    where: { topicId: 'c3037d6c-33e1-4cee-9844-631f5a19f111' },
    include: { prerequisite: { include: { chapter: true } } }
  });
  console.log(JSON.stringify(prereqs, null, 2));
}
main();
