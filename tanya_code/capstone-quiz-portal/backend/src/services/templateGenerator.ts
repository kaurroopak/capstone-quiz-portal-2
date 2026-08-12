import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';

export const generateExcelTemplate = () => {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const rootDestPath = path.join(process.cwd(), '../sample_template.xlsx');
  const uploadDestPath = path.join(uploadsDir, 'sample_template.xlsx');

  // Check if template already exists
  if (fs.existsSync(uploadDestPath) && fs.existsSync(rootDestPath)) {
    console.log('[Template] Excel template already exists.');
    return;
  }

  console.log('[Template] Generating sample Excel template...');

  // Define headers and mock rows
  const headers = [
    'Chapter Name',
    'Topic Name',
    'Question Text',
    'Option A',
    'Option B',
    'Option C',
    'Option D',
    'Correct Answer',
    'Difficulty',
    'Image Reference'
  ];

  const sampleRows = [
    {
      'Chapter Name': 'Science - Chemical Reactions & Equations',
      'Topic Name': 'Types of Chemical Reactions',
      'Question Text': 'What type of reaction is: C(s) + O2(g) -> CO2(g)?',
      'Option A': 'Decomposition Reaction',
      'Option B': 'Combination Reaction',
      'Option C': 'Displacement Reaction',
      'Option D': 'Double Displacement Reaction',
      'Correct Answer': 'B',
      'Difficulty': 'EASY',
      'Image Reference': ''
    },
    {
      'Chapter Name': 'Mathematics - Quadratic Equations',
      'Topic Name': 'Nature of Roots',
      'Question Text': 'What is the nature of roots for a quadratic equation when D = 0?',
      'Option A': 'Real and distinct roots',
      'Option B': 'Real and equal roots',
      'Option C': 'No real roots',
      'Option D': 'Equal and imaginary roots',
      'Correct Answer': 'B',
      'Difficulty': 'EASY',
      'Image Reference': ''
    },
    {
      'Chapter Name': 'Science - Light Reflection & Refraction',
      'Topic Name': 'Spherical Mirrors',
      'Question Text': 'Identify the ray direction after passing through the focal point in the given diagram.',
      'Option A': 'Goes parallel to principal axis',
      'Option B': 'Reflects back along the same path',
      'Option C': 'Passes straight through center',
      'Option D': 'Diverges outward',
      'Correct Answer': 'A',
      'Difficulty': 'MEDIUM',
      'Image Reference': 'mirror_focal_point.png'
    }
  ];

  // Create workbook & sheet
  const workbook = xlsx.utils.book_new();
  const worksheet = xlsx.utils.json_to_sheet(sampleRows, { header: headers });

  // Adjust column widths for better legibility
  worksheet['!cols'] = [
    { wch: 35 }, // Chapter Name
    { wch: 25 }, // Topic Name
    { wch: 45 }, // Question Text
    { wch: 20 }, // Option A
    { wch: 20 }, // Option B
    { wch: 20 }, // Option C
    { wch: 20 }, // Option D
    { wch: 15 }, // Correct Answer
    { wch: 12 }, // Difficulty
    { wch: 20 }  // Image Reference
  ];

  xlsx.utils.book_append_sheet(workbook, worksheet, 'Syllabus Template');

  // Ensure uploads directory exists
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Write to uploads folder for download link
  const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  fs.writeFileSync(uploadDestPath, buffer);
  
  // Also write to the root directory
  fs.writeFileSync(rootDestPath, buffer);

  console.log('[Template] Excel template generated successfully at uploads/ and project root.');
};
export default generateExcelTemplate;
