import { ApplicationStatus } from '../constants/application-status.constant';

export interface ExperienceBlock {
  company?: string;
  title?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface EducationBlock {
  institution?: string;
  degree?: string;
  startDate?: string;
  endDate?: string;
}

export interface ApplicationCandidate {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  professionalTitle?: string | null;
  bio?: string | null;
  skills?: string[] | null;
  experiences?: ExperienceBlock[] | null;
  education?: EducationBlock[] | null;
  resumeUrl?: string | null;
  minSalary?: number | null;
}

export interface ApplicationJob {
  id: string;
  title: string;
  companyId?: string;
  location?: string | null;
  remoteType?: string;
  contractType?: string;
  company?: {
    id: string;
    name: string;
    logoUrl: string | null;
  } | null;
}

export interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  status: ApplicationStatus;
  coverLetter: string | null;
  resumeSnapshotUrl: string | null;
  rating: number | null;
  interviewAt: string | null;
  archivedAt?: string | null;
  archivedBy?: string | null;
  candidateArchivedAt?: string | null;
  deletedByRecruiterAt?: string | null;
  createdAt: string;
  updatedAt: string;
  job?: ApplicationJob;
  candidate?: ApplicationCandidate;
}

export interface ApplicationNote {
  id: string;
  authorId: string;
  noteText: string;
  createdAt: string;
}

export interface QuizAnswerStored {
  questionIndex: number;
  choiceIndex: number;
}

export interface ApplicationQuizReviewQuestion {
  questionIndex: number;
  text: string;
  choices: { text: string }[];
  correctChoiceIndex: number;
  candidateChoiceIndex: number | null;
  isCorrect: boolean;
  candidateChoiceText: string | null;
  correctChoiceText: string | null;
}

export interface ApplicationQuizReview {
  questions: ApplicationQuizReviewQuestion[];
}

export interface ApplicationDetail extends Application {
  quizAnswers?: QuizAnswerStored[] | null;
  quizReview?: ApplicationQuizReview | null;
  notes: ApplicationNote[];
}

export interface UpdateApplicationStatusPayload {
  status: ApplicationStatus;
  rating?: number | null;
  evaluationText?: string | null;
  internalNote?: string | null;
  interviewAt?: string | null;
}
