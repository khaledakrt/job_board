export interface JobQuizChoice {
  text: string;
}

export interface JobQuizQuestion {
  text: string;
  choices: JobQuizChoice[];
  correctChoiceIndex: number;
}

export interface JobQuiz {
  questions: JobQuizQuestion[];
}

/** Quiz exposed to candidates (no correct answer index). */
export interface PublicJobQuizQuestion {
  text: string;
  choices: JobQuizChoice[];
}

export interface PublicJobQuiz {
  questions: PublicJobQuizQuestion[];
}

export interface QuizAnswerPayload {
  questionIndex: number;
  choiceIndex: number;
}

export interface GenerateQuizPayload {
  title: string;
  description: string;
  requirements?: string | null;
  tags?: string[] | null;
  languages?: string[] | null;
}

export function createEmptyQuiz(): JobQuiz {
  const emptyQuestion = (): JobQuizQuestion => ({
    text: '',
    choices: [{ text: '' }, { text: '' }, { text: '' }],
    correctChoiceIndex: 0,
  });
  return { questions: [emptyQuestion(), emptyQuestion()] };
}

export function cloneQuiz(quiz: JobQuiz): JobQuiz {
  return {
    questions: quiz.questions.map((q) => ({
      text: q.text,
      correctChoiceIndex: q.correctChoiceIndex,
      choices: q.choices.map((c) => ({ text: c.text })),
    })),
  };
}
