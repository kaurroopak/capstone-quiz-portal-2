import prisma from '../src/config/db';

async function main() {
  console.log('Seeding Magnetism Skill Tree...');

  // 1. Create or get Chapter
  const chapterName = 'Magnetism';
  let chapter = await prisma.chapter.findUnique({ where: { name: chapterName } });
  if (!chapter) {
    chapter = await prisma.chapter.create({ data: { name: chapterName } });
  }

  const topicNames = [
    'Magnetic Field and Field Lines', // Root
    'Magnetic Field due to Current Carrying Conductor', // Depends on root
    'Right-Hand Thumb Rule', // Depends on current carrying conductor
    'Force on Current Carrying Conductor', // Depends on field lines
    'Flemings Left-Hand Rule', // Depends on force
    'Electromagnetic Induction' // Depends on field lines and force
  ];

  const topics: Record<string, any> = {};

  // 2. Create Topics
  for (const name of topicNames) {
    let topic = await prisma.topic.findUnique({
      where: { name_chapterId: { name, chapterId: chapter.id } }
    });
    if (!topic) {
      topic = await prisma.topic.create({
        data: { name, chapterId: chapter.id }
      });
    }
    topics[name] = topic;
  }

  // Helper to add prerequisite
  const addPrereq = async (topicName: string, prereqName: string) => {
    const topicId = topics[topicName].id;
    const prereqId = topics[prereqName].id;

    const existing = await prisma.topicPrerequisite.findUnique({
      where: { topicId_prerequisiteId: { topicId, prerequisiteId: prereqId } }
    });

    if (!existing) {
      await prisma.topicPrerequisite.create({
        data: { topicId, prerequisiteId: prereqId }
      });
      console.log(`Added prerequisite: ${prereqName} -> ${topicName}`);
    }
  };

  // 3. Link them up (Skill Tree Structure)
  await addPrereq('Magnetic Field due to Current Carrying Conductor', 'Magnetic Field and Field Lines');
  await addPrereq('Right-Hand Thumb Rule', 'Magnetic Field due to Current Carrying Conductor');
  await addPrereq('Force on Current Carrying Conductor', 'Magnetic Field and Field Lines');
  await addPrereq('Flemings Left-Hand Rule', 'Force on Current Carrying Conductor');
  await addPrereq('Electromagnetic Induction', 'Force on Current Carrying Conductor');
  await addPrereq('Electromagnetic Induction', 'Magnetic Field and Field Lines');

  console.log('Magnetism skill tree seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
