export type TrainingDeliveryMode = 'online' | 'onsite' | 'hybrid';

export type InstitutionType =
  | 'primary'
  | 'college'
  | 'high_school'
  | 'higher_institute'
  | 'university'
  | 'academy';

export interface SocialLink {
  label?: string;
  url: string;
}

export interface TrainingCourseItem {
  id?: string;
  title: string;
  description?: string | null;
  deliveryMode?: TrainingDeliveryMode | null;
  status?: 'draft' | 'published';
}

export interface TrainingCenterCard {
  id: string;
  name: string;
  logoUrl: string | null;
  city: string | null;
  trainingDomain: string | null;
  deliveryMode: TrainingDeliveryMode | null;
  shortDescription: string | null;
  courseCount: number;
}

export type CatalogPublishStatus = 'pending' | 'published' | 'rejected';

export type TrainingEventType =
  | 'workshop'
  | 'conference'
  | 'seminar'
  | 'open_day'
  | 'webinar'
  | 'other';

export type ParticipationType = 'interested' | 'registered';

export interface TrainingFormationItem {
  id: string;
  centerId?: string;
  centerName?: string | null;
  title: string;
  category?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  durationLabel?: string | null;
  city?: string | null;
  address?: string | null;
  deliveryMode?: TrainingDeliveryMode | null;
  price?: number | null;
  certificateDelivered?: boolean;
  seats?: number | null;
  mainImageUrl?: string | null;
  gallery?: string[];
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  status?: CatalogPublishStatus;
  adminNote?: string | null;
  participationType?: ParticipationType | null;
  /** Inscrits affichés sur le catalogue (plafonné aux places si définies). */
  participantsCount?: number | null;
  registeredCount?: number;
  participants?: ProviderParticipationItem[];
  registeredParticipants?: ProviderParticipationItem[];
}

export interface TrainingEventItem {
  id: string;
  centerId?: string;
  centerName?: string | null;
  title: string;
  eventType: TrainingEventType;
  description?: string | null;
  eventDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  city?: string | null;
  address?: string | null;
  price?: number | null;
  seats?: number | null;
  posterImageUrl?: string | null;
  gallery?: string[];
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  status?: CatalogPublishStatus;
  adminNote?: string | null;
  participationType?: ParticipationType | null;
  participantsCount?: number | null;
  registeredCount?: number;
  participants?: ProviderParticipationItem[];
  registeredParticipants?: ProviderParticipationItem[];
}

export interface TrainingCenterDetail extends TrainingCenterCard {
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  photos: string[];
  socialLinks: SocialLink[];
  brochures?: string[];
  courses: TrainingCourseItem[];
  formations?: TrainingFormationItem[];
  events?: TrainingEventItem[];
}

export interface OfferingsSummary {
  total: number;
  pending: number;
  published: number;
}

export interface ParticipationsSummary {
  total: number;
  interested: number;
  registered: number;
}

export interface ParticipationCandidate {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  phone: string | null;
  professionalTitle: string | null;
  avatarUrl: string | null;
}

export interface ProviderParticipationItem {
  id: string;
  offeringKind: 'formation' | 'event';
  offeringId: string;
  offeringTitle: string;
  participationType: 'interested' | 'registered';
  participationLabel: string;
  createdAt: string;
  candidate: ParticipationCandidate;
}

export interface ProviderParticipationsResponse {
  items: ProviderParticipationItem[];
  summary: ParticipationsSummary & { formations: number; events: number };
}

export interface ProviderDashboard {
  accountStatus: string;
  canPublishOfferings: boolean;
  profileComplete: boolean;
  organization: TrainingCenterDetail | PrivateInstitutionDetail;
  stats: Record<string, number>;
  formationsSummary?: OfferingsSummary;
  eventsSummary?: OfferingsSummary;
  participationsSummary?: ParticipationsSummary;
}

export interface PrivateInstitutionCard {
  id: string;
  name: string;
  institutionType: InstitutionType;
  logoUrl: string | null;
  city: string | null;
  shortDescription: string | null;
}

export interface ProgramItem {
  title: string;
  description?: string | null;
}

export type InstitutionOfferingType = 'program' | 'event' | 'announcement' | 'opportunity';
export type InstitutionOfferingStatus = 'draft' | 'pending' | 'published' | 'rejected';
export type InstitutionEventType =
  | 'open_day'
  | 'conference'
  | 'seminar'
  | 'workshop'
  | 'webinar'
  | 'admission_contest'
  | 'other';

export interface InstitutionOfferingItem {
  id: string;
  institutionId: string;
  offeringType: InstitutionOfferingType;
  title: string;
  summary?: string | null;
  description?: string | null;
  category?: string | null;
  eventType?: InstitutionEventType | null;
  opportunityType?: 'job' | 'internship' | null;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  city?: string | null;
  address?: string | null;
  price?: number | null;
  seats?: number | null;
  mainImageUrl?: string | null;
  gallery?: string[];
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  status: InstitutionOfferingStatus;
  adminNote?: string | null;
  viewsCount: number;
  clicksCount: number;
  registrationsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PrivateInstitutionDetail extends PrivateInstitutionCard {
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  mapUrl: string | null;
  photos: string[];
  socialLinks: SocialLink[];
  brochures?: string[];
  programs: ProgramItem[];
  institutionOfferings?: InstitutionOfferingItem[];
  publishedPrograms?: InstitutionOfferingItem[];
  publishedEvents?: InstitutionOfferingItem[];
  publishedAnnouncements?: InstitutionOfferingItem[];
  publishedOpportunities?: InstitutionOfferingItem[];
}

export interface CatalogSubmitResult {
  id: string;
  status: string;
  message: string;
}
