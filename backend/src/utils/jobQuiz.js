'use strict';

const QUIZ_QUESTION_COUNT = 2;
const QUIZ_CHOICE_COUNT = 3;

function normalizeQuizQuestion(raw, index) {
  const text = String(raw?.text ?? '').trim();
  const choices = Array.isArray(raw?.choices) ? raw.choices : [];
  const normalizedChoices = choices.slice(0, QUIZ_CHOICE_COUNT).map((c, i) => ({
    text: String(c?.text ?? '').trim() || `Choix ${i + 1}`,
  }));

  while (normalizedChoices.length < QUIZ_CHOICE_COUNT) {
    normalizedChoices.push({ text: `Choix ${normalizedChoices.length + 1}` });
  }

  let correctChoiceIndex = Number(raw?.correctChoiceIndex);
  if (!Number.isInteger(correctChoiceIndex) || correctChoiceIndex < 0 || correctChoiceIndex > 2) {
    correctChoiceIndex = 0;
  }

  return {
    text: text || `Question ${index + 1}`,
    choices: normalizedChoices,
    correctChoiceIndex,
  };
}

function parseQuizData(raw) {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw;
}

function normalizeQuizData(raw) {
  const data = parseQuizData(raw);
  if (!data || !Array.isArray(data.questions)) {
    return null;
  }

  const questions = data.questions
    .slice(0, QUIZ_QUESTION_COUNT)
    .map((q, i) => normalizeQuizQuestion(q, i));

  while (questions.length < QUIZ_QUESTION_COUNT) {
    questions.push(
      normalizeQuizQuestion(
        {
          text: '',
          choices: [{ text: '' }, { text: '' }, { text: '' }],
          correctChoiceIndex: 0,
        },
        questions.length
      )
    );
  }

  return { questions };
}

function validateQuizForSave(quizData) {
  if (!quizData?.questions || quizData.questions.length !== QUIZ_QUESTION_COUNT) {
    return 'Le quiz doit contenir exactement 2 questions';
  }

  for (let i = 0; i < quizData.questions.length; i += 1) {
    const q = quizData.questions[i];
    if (!q.text || q.text.length < 5) {
      return `La question ${i + 1} doit contenir au moins 5 caractères`;
    }
    if (!q.choices || q.choices.length !== QUIZ_CHOICE_COUNT) {
      return `La question ${i + 1} doit avoir 3 réponses`;
    }
    for (let j = 0; j < q.choices.length; j += 1) {
      if (!q.choices[j].text || q.choices[j].text.length < 1) {
        return `Réponse ${j + 1} de la question ${i + 1} est requise`;
      }
    }
    if (
      !Number.isInteger(q.correctChoiceIndex) ||
      q.correctChoiceIndex < 0 ||
      q.correctChoiceIndex >= QUIZ_CHOICE_COUNT
    ) {
      return `Indiquez la bonne réponse pour la question ${i + 1}`;
    }
  }

  return null;
}

function formatQuizForRecruiter(quizData) {
  if (!quizData) return null;
  return normalizeQuizData(quizData);
}

function formatQuizForCandidate(quizData) {
  const normalized = normalizeQuizData(quizData);
  if (!normalized) return null;

  return {
    questions: normalized.questions.map((q) => ({
      text: q.text,
      choices: q.choices.map((c) => ({ text: c.text })),
    })),
  };
}

function validateQuizAnswers(quizData, answers) {
  const normalized = normalizeQuizData(quizData);
  if (!normalized) {
    return { ok: false, message: 'Quiz configuration is invalid' };
  }

  if (!Array.isArray(answers) || answers.length !== QUIZ_QUESTION_COUNT) {
    return { ok: false, message: 'Veuillez répondre à toutes les questions du quiz avant de postuler' };
  }

  const byIndex = new Map();
  for (const entry of answers) {
    const questionIndex = Number(entry?.questionIndex);
    const choiceIndex = Number(entry?.choiceIndex);
    if (
      !Number.isInteger(questionIndex) ||
      questionIndex < 0 ||
      questionIndex >= QUIZ_QUESTION_COUNT
    ) {
      return { ok: false, message: 'Réponse au quiz invalide' };
    }
    if (!Number.isInteger(choiceIndex) || choiceIndex < 0 || choiceIndex >= QUIZ_CHOICE_COUNT) {
      return { ok: false, message: 'Réponse au quiz invalide' };
    }
    byIndex.set(questionIndex, choiceIndex);
  }

  for (let i = 0; i < QUIZ_QUESTION_COUNT; i += 1) {
    if (!byIndex.has(i)) {
      return { ok: false, message: 'Veuillez répondre à toutes les questions du quiz avant de postuler' };
    }
  }

  return {
    ok: true,
    stored: answers.map((a) => ({
      questionIndex: Number(a.questionIndex),
      choiceIndex: Number(a.choiceIndex),
    })),
  };
}

/** Compares candidate answers to recruiter-configured quiz (for ATS review). */
function buildQuizReview(quizData, candidateAnswers) {
  const normalized = normalizeQuizData(quizData);
  if (!normalized || !Array.isArray(candidateAnswers) || candidateAnswers.length === 0) {
    return null;
  }

  const byIndex = new Map(
    candidateAnswers.map((a) => [Number(a.questionIndex), Number(a.choiceIndex)])
  );

  return {
    questions: normalized.questions.map((q, questionIndex) => {
      const candidateChoiceIndex = byIndex.get(questionIndex);
      const correctChoiceIndex = q.correctChoiceIndex;
      const hasAnswer =
        Number.isInteger(candidateChoiceIndex) &&
        candidateChoiceIndex >= 0 &&
        candidateChoiceIndex < QUIZ_CHOICE_COUNT;

      return {
        questionIndex,
        text: q.text,
        choices: q.choices.map((c) => ({ text: c.text })),
        correctChoiceIndex,
        candidateChoiceIndex: hasAnswer ? candidateChoiceIndex : null,
        isCorrect: hasAnswer ? candidateChoiceIndex === correctChoiceIndex : false,
        candidateChoiceText: hasAnswer ? q.choices[candidateChoiceIndex]?.text ?? null : null,
        correctChoiceText: q.choices[correctChoiceIndex]?.text ?? null,
      };
    }),
  };
}

module.exports = {
  QUIZ_QUESTION_COUNT,
  QUIZ_CHOICE_COUNT,
  normalizeQuizData,
  validateQuizForSave,
  formatQuizForRecruiter,
  formatQuizForCandidate,
  validateQuizAnswers,
  buildQuizReview,
};
