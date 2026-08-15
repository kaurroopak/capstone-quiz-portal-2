import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Synapse Capstone Project Quiz...');

  // 1. Create/Find Chapter
  const chapter = await prisma.chapter.upsert({
    where: { name: 'Synapse Capstone Project' },
    update: {},
    create: { name: 'Synapse Capstone Project' }
  });
  console.log('Chapter created/found:', chapter.name);

  // 2. Create/Find Topic
  const topic = await prisma.topic.upsert({
    where: { name_chapterId: { name: 'Synapse Architecture & Methodology', chapterId: chapter.id } },
    update: {},
    create: { name: 'Synapse Architecture & Methodology', chapterId: chapter.id }
  });
  console.log('Topic created/found:', topic.name);

  // 3. Create Study Content for the Topic
  await prisma.topicContent.upsert({
    where: { topicId: topic.id },
    update: {
      learnText: 'Synapse is an AI-powered adaptive learning platform designed to personalize secondary science education. Rather than treating evaluation as a simple binary of right or wrong, Synapse uses Cognitive Traceability to understand the thinking process, identifying prerequisite gaps and misconceptions by tracking response accuracy, time-on-task, and response patterns.',
      notes: '• Sourcing parameters: Classical 2PL IRT requires massive dataset calibration. Synapse resolves the cold-start problem by reading item difficulty (b) directly from Bloom\'s Taxonomy levels, and item discrimination (a) from student KMeans clusters.\n• Latent Ability: Student\'s latent ability (theta) is calculated using a standard Newton-Raphson Maximum Likelihood Estimation (MLE) procedure.\n• Bayesian Knowledge Tracing: BKT uses a Hidden Markov Model (HMM) to trace concept mastery over time, updating the student\'s mastery probability after every response.',
      examples: 'Example: Bloom\'s Level to IRT Difficulty mapping:\nRemember = -2.0 (Easy)\nUnderstand = -1.0 (Easy)\nApply = 0.0 (Medium)\nAnalyze = 1.0 (Hard)\nEvaluate = 2.0 (Hard)\nCreate = 2.5 (Hard)',
      formula: '2PL IRT probability curve:\nP(correct | theta) = 1 / (1 + e^(-a * (theta - b)))\n\nDiscriminant (D) equation:\nD = b^2 - 4ac'
    },
    create: {
      topicId: topic.id,
      learnText: 'Synapse is an AI-powered adaptive learning platform designed to personalize secondary science education. Rather than treating evaluation as a simple binary of right or wrong, Synapse uses Cognitive Traceability to understand the thinking process, identifying prerequisite gaps and misconceptions by tracking response accuracy, time-on-task, and response patterns.',
      notes: '• Sourcing parameters: Classical 2PL IRT requires massive dataset calibration. Synapse resolves the cold-start problem by reading item difficulty (b) directly from Bloom\'s Taxonomy levels, and item discrimination (a) from student KMeans clusters.\n• Latent Ability: Student\'s latent ability (theta) is calculated using a standard Newton-Raphson Maximum Likelihood Estimation (MLE) procedure.\n• Bayesian Knowledge Tracing: BKT uses a Hidden Markov Model (HMM) to trace concept mastery over time, updating the student\'s mastery probability after every response.',
      examples: 'Example: Bloom\'s Level to IRT Difficulty mapping:\nRemember = -2.0 (Easy)\nUnderstand = -1.0 (Easy)\nApply = 0.0 (Medium)\nAnalyze = 1.0 (Hard)\nEvaluate = 2.0 (Hard)\nCreate = 2.5 (Hard)',
      formula: '2PL IRT probability curve:\nP(correct | theta) = 1 / (1 + e^(-a * (theta - b)))\n\nDiscriminant (D) equation:\nD = b^2 - 4ac'
    }
  });
  console.log('Study notes populated for topic.');

  // 4. Create Quiz and Questions
  const existingQuiz = await prisma.quiz.findFirst({
    where: { title: 'Synapse Mid-Sem Evaluation Quiz' }
  });

  if (!existingQuiz) {
    const quiz = await prisma.quiz.create({
      data: {
        title: 'Synapse Mid-Sem Evaluation Quiz',
        description: 'Test your understanding of the Synapse platform methodology, IRT, BKT, and Bloom difficulty mapping.',
        topicId: topic.id,
        duration: 300, // 5 minutes
        isActive: true,
        shuffle: false,
        difficulty: Difficulty.MEDIUM,
        questions: {
          create: [
            {
              text: 'What is the core formula used in the Two-Parameter Logistic (2PL) Item Response Theory model for Synapse?',
              optionA: 'P(correct | theta) = 1 / (1 + e^(-a(theta-b)))',
              optionB: 'P(correct | theta) = e^(-a(theta-b))',
              optionC: 'P(correct | theta) = 1 / (1 + e^(a(theta-b)))',
              optionD: 'P(correct | theta) = a(theta-b)',
              correctAnswer: CorrectAnswer.A,
              difficulty: Difficulty.MEDIUM
            },
            {
              text: 'Which taxonomy is used by the Synapse platform to map initial item difficulty (b)?',
              optionA: 'Bloom\'s Taxonomy',
              optionB: 'Webb\'s Depth of Knowledge',
              optionC: 'Gagne\'s Levels of Learning',
              optionD: 'SOLO Taxonomy',
              correctAnswer: CorrectAnswer.A,
              difficulty: Difficulty.EASY
            },
            {
              text: 'How does Synapse solve the cold-start problem of parameter calibration in classical IRT?',
              optionA: 'Reads difficulty from Bloom\'s level and derives discrimination from student KMeans clusters',
              optionB: 'Runs random guessing checks on student attempts',
              optionC: 'Calibrates using thousands of mock simulated answers',
              optionD: 'Discards the discrimination parameter completely',
              correctAnswer: CorrectAnswer.A,
              difficulty: Difficulty.HARD
            },
            {
              text: 'Which model is used in Synapse for longitudinal knowledge and concept mastery tracking over time?',
              optionA: 'Bayesian Knowledge Tracing (BKT)',
              optionB: 'Linear Regression Analysis',
              optionC: 'Support Vector Machines (SVM)',
              optionD: 'Decision Tree Classifiers',
              correctAnswer: CorrectAnswer.A,
              difficulty: Difficulty.EASY
            },
            {
              text: 'In the Bloom\'s Level to difficulty mapping for Synapse, what is the difficulty value (b) for the \'Create\' cognitive complexity level?',
              optionA: '2.5',
              optionB: '1.0',
              optionC: '0.0',
              optionD: '-2.0',
              correctAnswer: CorrectAnswer.A,
              difficulty: Difficulty.MEDIUM
            }
          ]
        }
      }
    });
    console.log('Quiz and 5 questions created successfully:', quiz.title);
  } else {
    console.log('Quiz already exists in database.');
  }

  console.log('Synapse seeding complete!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
