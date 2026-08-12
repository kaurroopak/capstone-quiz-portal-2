import xlsx from 'xlsx';

export interface ExcelQuestionRow {
  rowNumber: number;
  chapterName: string;
  topicName: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  imageRef?: string;
}

export interface ParseResult {
  data: ExcelQuestionRow[];
  errors: { row: number; errors: string[] }[];
}

export const parseExcelFile = (buffer: Buffer): ParseResult => {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Convert sheet to JSON array of objects
  const rawRows: any[] = xlsx.utils.sheet_to_json(sheet, { defval: '' });
  
  const parsedData: ExcelQuestionRow[] = [];
  const validationErrors: { row: number; errors: string[] }[] = [];
  
  rawRows.forEach((row, index) => {
    const rowNum = index + 2; // Row number in spreadsheet (1-indexed + header row)
    const errors: string[] = [];

    // Helper to find case-insensitive keys
    const getValue = (synonyms: string[]): string => {
      for (const key of Object.keys(row)) {
        if (synonyms.some(syn => syn.toLowerCase() === key.trim().toLowerCase())) {
          return String(row[key]).trim();
        }
      }
      return '';
    };

    const chapterName = getValue(['Chapter', 'Chapter Name', 'ChapterName']);
    const topicName = getValue(['Topic', 'Topic Name', 'TopicName']);
    const questionText = getValue(['Question', 'Question Text', 'QuestionText', 'Question_Text']);
    const optionA = getValue(['Option A', 'OptionA', 'A', 'Opt A']);
    const optionB = getValue(['Option B', 'OptionB', 'B', 'Opt B']);
    const optionC = getValue(['Option C', 'OptionC', 'C', 'Opt C']);
    const optionD = getValue(['Option D', 'OptionD', 'D', 'Opt D']);
    const correctAnswerRaw = getValue(['Correct Answer', 'CorrectAnswer', 'Correct Option', 'Answer']).toUpperCase();
    const difficultyRaw = getValue(['Difficulty']).toUpperCase();
    const imageRef = getValue(['Image Reference', 'ImageReference', 'Image', 'ImageRef']);

    // Validations
    if (!chapterName) errors.push('Chapter Name is required.');
    if (!topicName) errors.push('Topic Name is required.');
    if (!questionText) errors.push('Question Text is required.');
    if (!optionA) errors.push('Option A is required.');
    if (!optionB) errors.push('Option B is required.');
    if (!optionC) errors.push('Option C is required.');
    if (!optionD) errors.push('Option D is required.');

    let correctAnswer: 'A' | 'B' | 'C' | 'D' = 'A';
    if (!correctAnswerRaw) {
      errors.push('Correct Answer is required.');
    } else if (!['A', 'B', 'C', 'D'].includes(correctAnswerRaw)) {
      errors.push(`Invalid Correct Answer: "${correctAnswerRaw}". Must be A, B, C, or D.`);
    } else {
      correctAnswer = correctAnswerRaw as 'A' | 'B' | 'C' | 'D';
    }

    let difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'EASY';
    if (!difficultyRaw) {
      errors.push('Difficulty is required.');
    } else if (!['EASY', 'MEDIUM', 'HARD'].includes(difficultyRaw)) {
      errors.push(`Invalid Difficulty: "${difficultyRaw}". Must be EASY, MEDIUM, or HARD.`);
    } else {
      difficulty = difficultyRaw as 'EASY' | 'MEDIUM' | 'HARD';
    }

    if (errors.length > 0) {
      validationErrors.push({ row: rowNum, errors });
    } else {
      parsedData.push({
        rowNumber: rowNum,
        chapterName,
        topicName,
        questionText,
        optionA,
        optionB,
        optionC,
        optionD,
        correctAnswer,
        difficulty,
        imageRef: imageRef || undefined
      });
    }
  });

  return {
    data: parsedData,
    errors: validationErrors
  };
};
