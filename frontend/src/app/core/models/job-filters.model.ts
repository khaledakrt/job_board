export type ExperienceFilter = 'all' | 'junior' | 'mid' | 'senior';

export type JobSortBy = 'date' | 'salary' | 'experience';

export interface JobSearchFilters {
  keywords: string;
  location: string;
  company: string;
  industry: string;
  contracts: string[];
  remotes: string[];
  experience: ExperienceFilter;
  quizOnly: boolean;
  minSalary: number | null;
  sortBy: JobSortBy;
}

export const DEFAULT_JOB_SEARCH_FILTERS: JobSearchFilters = {
  keywords: '',
  location: '',
  company: '',
  industry: '',
  contracts: [],
  remotes: [],
  experience: 'all',
  quizOnly: false,
  minSalary: null,
  sortBy: 'date',
};
