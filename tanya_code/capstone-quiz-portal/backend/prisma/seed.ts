import { PrismaClient, Role, Difficulty, CorrectAnswer } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with Class 10 Physics curriculum & prerequisite graph...');

  // Hash passwords
  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create Teacher
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@quiz.com' },
    update: {
      theta: 2.5,
      iqScore: 130.0
    },
    create: {
      username: 'teacher',
      email: 'teacher@quiz.com',
      password: passwordHash,
      role: Role.TEACHER,
      learningStyle: 'Auditory Learner',
      readingSpeed: 'Above Average',
      workingMemory: 'High',
      processingSpeed: 'High',
      theta: 2.5,
      iqScore: 130.0
    }
  });
  console.log('Teacher created/updated:', teacher.email);

  // 2. Create Student
  const student = await prisma.user.upsert({
    where: { email: 'student@quiz.com' },
    update: {
      theta: 0.8,
      iqScore: 110.0
    },
    create: {
      username: 'student10',
      email: 'student@quiz.com',
      password: passwordHash,
      role: Role.STUDENT,
      learningStyle: 'Visual Learner',
      readingSpeed: 'Average',
      workingMemory: 'Average',
      processingSpeed: 'Average',
      theta: 0.8,
      iqScore: 110.0
    }
  });
  console.log('Student created/updated:', student.email);

  // ----------------------------------------------------
  // 3. Create Class 10 Physics Chapters & Topics
  // ----------------------------------------------------

  // Chapter 1: Light - Reflection & Refraction
  const chLight = await prisma.chapter.upsert({
    where: { name: 'Physics - Light: Reflection & Refraction' },
    update: {},
    create: { name: 'Physics - Light: Reflection & Refraction' }
  });

  const tLight1 = await prisma.topic.upsert({
    where: { name_chapterId: { name: 'Spherical Mirrors & Ray Diagrams', chapterId: chLight.id } },
    update: {},
    create: { name: 'Spherical Mirrors & Ray Diagrams', chapterId: chLight.id }
  });

  const tLight2 = await prisma.topic.upsert({
    where: { name_chapterId: { name: 'Refraction & Snell\'s Law', chapterId: chLight.id } },
    update: {},
    create: { name: 'Refraction & Snell\'s Law', chapterId: chLight.id }
  });

  const tLight3 = await prisma.topic.upsert({
    where: { name_chapterId: { name: 'Lens Formula & Power of Lens', chapterId: chLight.id } },
    update: {},
    create: { name: 'Lens Formula & Power of Lens', chapterId: chLight.id }
  });

  // Chapter 2: Human Eye & Colourful World
  const chEye = await prisma.chapter.upsert({
    where: { name: 'Physics - Human Eye & Colourful World' },
    update: {},
    create: { name: 'Physics - Human Eye & Colourful World' }
  });

  const tEye1 = await prisma.topic.upsert({
    where: { name_chapterId: { name: 'Structure of Eye & Defects of Vision', chapterId: chEye.id } },
    update: {},
    create: { name: 'Structure of Eye & Defects of Vision', chapterId: chEye.id }
  });

  const tEye2 = await prisma.topic.upsert({
    where: { name_chapterId: { name: 'Prism Dispersion & Atmospheric Refraction', chapterId: chEye.id } },
    update: {},
    create: { name: 'Prism Dispersion & Atmospheric Refraction', chapterId: chEye.id }
  });

  // Chapter 3: Electricity
  const chElec = await prisma.chapter.upsert({
    where: { name: 'Physics - Electricity' },
    update: {},
    create: { name: 'Physics - Electricity' }
  });

  const tElec1 = await prisma.topic.upsert({
    where: { name_chapterId: { name: 'Electric Current & Potential Difference', chapterId: chElec.id } },
    update: {},
    create: { name: 'Electric Current & Potential Difference', chapterId: chElec.id }
  });

  const tElec2 = await prisma.topic.upsert({
    where: { name_chapterId: { name: 'Ohm\'s Law & Resistance', chapterId: chElec.id } },
    update: {},
    create: { name: 'Ohm\'s Law & Resistance', chapterId: chElec.id }
  });

  const tElec3 = await prisma.topic.upsert({
    where: { name_chapterId: { name: 'Series & Parallel Combinations', chapterId: chElec.id } },
    update: {},
    create: { name: 'Series & Parallel Combinations', chapterId: chElec.id }
  });

  const tElec4 = await prisma.topic.upsert({
    where: { name_chapterId: { name: 'Joule\'s Heating Effect & Electric Power', chapterId: chElec.id } },
    update: {},
    create: { name: 'Joule\'s Heating Effect & Electric Power', chapterId: chElec.id }
  });

  // Chapter 4: Magnetic Effects of Electric Current
  const chMag = await prisma.chapter.upsert({
    where: { name: 'Physics - Magnetic Effects of Electric Current' },
    update: {},
    create: { name: 'Physics - Magnetic Effects of Electric Current' }
  });

  const tMag1 = await prisma.topic.upsert({
    where: { name_chapterId: { name: 'Magnetic Field Lines & Solenoids', chapterId: chMag.id } },
    update: {},
    create: { name: 'Magnetic Field Lines & Solenoids', chapterId: chMag.id }
  });

  const tMag2 = await prisma.topic.upsert({
    where: { name_chapterId: { name: 'Fleming\'s Left Hand & Right Hand Rules', chapterId: chMag.id } },
    update: {},
    create: { name: 'Fleming\'s Left Hand & Right Hand Rules', chapterId: chMag.id }
  });

  // ----------------------------------------------------
  // 4. Create Prerequisite Graph Links (Step 2 Pipeline)
  // ----------------------------------------------------
  const prerequisites = [
    { topicId: tLight2.id, prerequisiteId: tLight1.id }, // Spherical Mirrors -> Refraction
    { topicId: tLight3.id, prerequisiteId: tLight2.id }, // Refraction -> Lens Formula
    { topicId: tEye2.id, prerequisiteId: tLight2.id },    // Refraction -> Prism Dispersion
    { topicId: tElec2.id, prerequisiteId: tElec1.id },   // Current/Potential -> Ohm's Law
    { topicId: tElec3.id, prerequisiteId: tElec2.id },   // Ohm's Law -> Series/Parallel
    { topicId: tElec4.id, prerequisiteId: tElec3.id },   // Series/Parallel -> Joule's Heating
    { topicId: tMag1.id, prerequisiteId: tElec1.id },    // Current -> Magnetic Fields
    { topicId: tMag2.id, prerequisiteId: tMag1.id }     // Magnetic Fields -> Fleming's Rules
  ];

  for (const pre of prerequisites) {
    await prisma.topicPrerequisite.upsert({
      where: { topicId_prerequisiteId: { topicId: pre.topicId, prerequisiteId: pre.prerequisiteId } },
      update: {},
      create: { topicId: pre.topicId, prerequisiteId: pre.prerequisiteId }
    });
  }

  // ----------------------------------------------------
  // 5. Seed Topic Study Content (NCERT Physics Grounding)
  // ----------------------------------------------------
  await prisma.topicContent.upsert({
    where: { topicId: tElec2.id },
    update: {},
    create: {
      topicId: tElec2.id,
      learnText: 'Ohm’s Law states that the electric current I flowing through a metallic conductor is directly proportional to the potential difference V across its ends, provided its temperature remains constant. V = I × R, where R is the resistance.',
      notes: '• Resistance R depends on length (L), area of cross-section (A), and temperature.\n• R = ρ (L / A), where ρ is electrical resistivity.\n• SI unit of resistance is Ohm (Ω); SI unit of resistivity is Ohm-meter (Ω·m).',
      examples: 'Example:\nHow much current will an electric bulb draw from a 220 V source, if the resistance of the bulb filament is 1200 Ω?\nSolution:\nV = 220 V, R = 1200 Ω.\nI = V / R = 220 / 1200 = 0.18 A.',
      formula: 'V = I × R\n\nR = ρ (L / A)\n\nI = V / R'
    }
  });

  await prisma.topicContent.upsert({
    where: { topicId: tLight1.id },
    update: {},
    create: {
      topicId: tLight1.id,
      learnText: 'Spherical mirrors have curved reflecting surfaces. A concave mirror reflects light inward to one focal point, whereas a convex mirror diverges light outwards.',
      notes: '• Mirror Formula: 1/f = 1/v + 1/u.\n• Magnification m = -v/u = h\'/h.\n• Concave mirrors form real/inverted images (except when object is between P and F).\n• Convex mirrors always form virtual, erect, and diminished images.',
      examples: 'Example:\nA convex mirror used for rear-view on an automobile has a radius of curvature of 3.00 m. If a bus is located at 5.00 m from this mirror, find the position of the image.\nSolution:\nR = +3.00 m => f = +1.50 m. Object distance u = -5.00 m.\n1/v = 1/f - 1/u = 1/1.50 - 1/(-5.00) = 1/1.50 + 1/5.00 => v = +1.15 m.',
      formula: 'Mirror Formula: 1/f = 1/v + 1/u\n\nMagnification: m = -v/u = h\'/h\n\nFocal Length: f = R / 2'
    }
  });

  // ----------------------------------------------------
  // 6. Seed Sample Class 10 Physics Quizzes & MCQs
  // ----------------------------------------------------
  const quizElectricity = await prisma.quiz.upsert({
    where: { id: 'quiz-physics-electricity-01' },
    update: {},
    create: {
      id: 'quiz-physics-electricity-01',
      title: 'Class 10 Physics: Ohm\'s Law & Resistance Mastery',
      description: 'Test your understanding of potential difference, resistance calculations, and circuit analysis.',
      topicId: tElec2.id,
      duration: 900, // 15 minutes
      isActive: true,
      shuffle: true,
      difficulty: Difficulty.MEDIUM
    }
  });

  const electricityQuestions = [
    {
      text: 'According to Ohm\'s law, if the potential difference across a conductor is doubled while temperature remains constant, what happens to the electric current?',
      optionA: 'Current is halved',
      optionB: 'Current is doubled',
      optionC: 'Current remains unchanged',
      optionD: 'Current increases four times',
      correctAnswer: CorrectAnswer.B,
      difficulty: Difficulty.EASY
    },
    {
      text: 'A wire of resistance R is stretched such that its length is doubled while keeping volume constant. What will be its new resistance?',
      optionA: '2 R',
      optionB: 'R / 2',
      optionC: '4 R',
      optionD: 'R / 4',
      correctAnswer: CorrectAnswer.C,
      difficulty: Difficulty.HARD
    },
    {
      text: 'Which of the following SI units represents Electrical Resistivity (ρ)?',
      optionA: 'Ohm (Ω)',
      optionB: 'Ohm per meter (Ω/m)',
      optionC: 'Ohm-meter (Ω·m)',
      optionD: 'Volt per Ampere (V/A)',
      correctAnswer: CorrectAnswer.C,
      difficulty: Difficulty.EASY
    },
    {
      text: 'If three resistors of 6 Ω each are connected in parallel, what is the equivalent resistance of the combination?',
      optionA: '18 Ω',
      optionB: '2 Ω',
      optionC: '3 Ω',
      optionD: '1 Ω',
      correctAnswer: CorrectAnswer.B,
      difficulty: Difficulty.MEDIUM
    }
  ];

  for (const q of electricityQuestions) {
    await prisma.question.create({
      data: {
        quizId: quizElectricity.id,
        text: q.text,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctAnswer: q.correctAnswer,
        difficulty: q.difficulty
      }
    });
  }

  const quizOptics = await prisma.quiz.upsert({
    where: { id: 'quiz-physics-optics-01' },
    update: {},
    create: {
      id: 'quiz-physics-optics-01',
      title: 'Class 10 Physics: Light & Spherical Mirrors Practice',
      description: 'Comprehensive test on ray diagrams, focal length calculations, and Cartesian sign conventions.',
      topicId: tLight1.id,
      duration: 900,
      isActive: true,
      shuffle: true,
      difficulty: Difficulty.MEDIUM
    }
  });

  const opticsQuestions = [
    {
      text: 'An object is placed at the principal focus (F) of a concave mirror. Where is its image formed?',
      optionA: 'At the focus (F)',
      optionB: 'At the center of curvature (C)',
      optionC: 'Between F and C',
      optionD: 'At infinity',
      correctAnswer: CorrectAnswer.D,
      difficulty: Difficulty.EASY
    },
    {
      text: 'The magnification produced by a rear-view mirror fitted in vehicles is always:',
      optionA: 'Less than 1',
      optionB: 'More than 1',
      optionC: 'Equal to 1',
      optionD: 'Can be more or less than 1 depending on distance',
      correctAnswer: CorrectAnswer.A,
      difficulty: Difficulty.MEDIUM
    },
    {
      text: 'A concave mirror produces a real, inverted image of the same size as the object. Where must the object be placed?',
      optionA: 'Between P and F',
      optionB: 'At F',
      optionC: 'At C',
      optionD: 'Beyond C',
      correctAnswer: CorrectAnswer.C,
      difficulty: Difficulty.MEDIUM
    }
  ];

  for (const q of opticsQuestions) {
    await prisma.question.create({
      data: {
        quizId: quizOptics.id,
        text: q.text,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctAnswer: q.correctAnswer,
        difficulty: q.difficulty
      }
    });
  }

  console.log('Class 10 Physics curriculum seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
