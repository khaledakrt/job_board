import { ContractType, JobStatus, RemoteType } from '../constants/job.constant';
import { JobQuiz, PublicJobQuiz } from './job-quiz.model';

export interface Job {
  id: string;
  companyId: string;
  recruiterId: string;
  title: string;
  description: string;
  requirements: string | null;
  tags: string[] | null;
  languages: string[] | null;
  benefits: string[] | null;
  experienceYears: number | null;
  location: string | null;
  remoteType: RemoteType;
  contractType: ContractType;
  salaryLabel: string | null;
  status: JobStatus;
  expiresAt: string;
  viewsCount: number;
  applicationsCount: number;
  quizEnabled?: boolean;
  quiz?: JobQuiz | PublicJobQuiz | null;
  createdAt: string;
  company?: {
    id: string;
    name: string;
    logoUrl: string | null;
    industry?: string | null;
  };
}

export interface JobPayload {
  title: string;
  description: string;
  requirements?: string | null;
  tags?: string[] | null;
  languages?: string[] | null;
  benefits?: string[] | null;
  experienceYears?: number | null;
  location?: string | null;
  remoteType: RemoteType;
  contractType: ContractType;
  salaryLabel?: string | null;
  status?: JobStatus;
  expiresAt?: string;
  quizEnabled?: boolean;
  quiz?: JobQuiz | null;
}
