import prisma from '../src/config/db';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('Seeding 2 students...');

  const students = [
    { username: 'student1', email: 'student1@example.com', password: 'password123' },
    { username: 'student2', email: 'student2@example.com', password: 'password123' }
  ];

  const saltRounds = 10;

  for (const student of students) {
    const existing = await prisma.user.findUnique({ where: { username: student.username } });
    
    if (existing) {
      console.log(`Student ${student.username} already exists.`);
    } else {
      const hashedPassword = await bcrypt.hash(student.password, saltRounds);
      await prisma.user.create({
        data: {
          username: student.username,
          email: student.email,
          password: hashedPassword,
          role: 'STUDENT',
          theta: 0.0,
          xp: 0
        }
      });
      console.log(`Created student: ${student.username}`);
    }
  }
  
  console.log('Finished seeding students.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
