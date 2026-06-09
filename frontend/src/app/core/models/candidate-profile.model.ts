export interface ExperienceBlock {
  company?: string;
  title?: string;
  city?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  description?: string;
}

export interface EducationBlock {
  institution?: string;
  degree?: string;
  city?: string;
  startDate?: string;
  endDate?: string;
}

export interface JobPreferences {
  contractTypes?: string[];
  remoteTypes?: string[];
  preferredLocations?: string[];
  mobility?: string;
}

export interface NotificationPreferences {
  emailEnabled?: boolean;
  inAppEnabled?: boolean;
  statusChange?: boolean;
  recruiterMessage?: boolean;
  jobAlert?: boolean;
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
  languages: string[] | null;
  certifications: string[] | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  experiences: ExperienceBlock[] | null;
  education: EducationBlock[] | null;
  resumeUrl: string | null;
  minSalary: number | null;
  jobPreferences: JobPreferences | null;
  notificationPreferences: NotificationPreferences | null;
  onboardingCompletedAt: string | null;
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
  label: string | null;
  isActive: boolean;
  frequency: 'daily' | 'weekly';
  createdAt: string;
  updatedAt: string;
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
