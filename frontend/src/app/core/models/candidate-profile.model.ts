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

export interface CandidateProfile {
  id: string;
  userId: string;
  email?: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  professionalTitle: string | null;
  bio: string | null;
  skills: string[] | null;
  experiences: ExperienceBlock[] | null;
  education: EducationBlock[] | null;
  resumeUrl: string | null;
  minSalary: number | null;
  updatedAt: string;
}

export interface ResumeParseResult {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  professional_title: string | null;
  bio?: string | null;
  skills: string[];
  experiences?: ExperienceBlock[];
  education?: EducationBlock[];
  parserMode: string;
  parseQuality?: 'ok' | 'low';
  aiEnabled?: boolean;
  cvLlmProvider?: 'ollama' | 'openai' | null;
  resumeSaved?: boolean;
  /** @deprecated use resumeSaved */
  savedToProfile?: boolean;
}

export interface SavedJobItem {
  id: string;
  jobId: string;
  createdAt: string;
  job: {
    id: string;
    title: string;
    location: string | null;
    remoteType: string;
    contractType: string;
    salaryLabel: string | null;
    languages: string[] | null;
    experienceYears: number | null;
    status: string;
    company: { id: string; name: string; logoUrl: string | null } | null;
  } | null;
}

export interface JobAlertItem {
  id: string;
  candidateId: string;
  searchFilters: Record<string, unknown>;
  createdAt: string;
}

export interface PaginatedJobs<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
