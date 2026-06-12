import { TrainingDeliveryMode, TrainingEventType } from '../../../core/models/catalog.model';

export const FORMATION_CATEGORY_OPTIONS = [
  'Informatique & digital',
  'Langues',
  'Management & leadership',
  'Comptabilité & finance',
  'Marketing & communication',
  'Santé & social',
  'Industrie & technique',
  'Soft skills',
  'Autre',
];

export const TRAINING_EVENT_TYPE_OPTIONS: { value: TrainingEventType; label: string }[] = [
  { value: 'workshop', label: 'Workshop' },
  { value: 'conference', label: 'Conférence' },
  { value: 'seminar', label: 'Séminaire' },
  { value: 'open_day', label: 'Journée portes ouvertes' },
  { value: 'webinar', label: 'Webinaire' },
  { value: 'other', label: 'Autre' },
];

export const DELIVERY_MODE_FORM_OPTIONS: { value: TrainingDeliveryMode; label: string }[] = [
  { value: 'onsite', label: 'Présentiel' },
  { value: 'online', label: 'En ligne' },
  { value: 'hybrid', label: 'Hybride' },
];

export function eventTypeLabel(type: TrainingEventType): string {
  return TRAINING_EVENT_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

export function catalogStatusLabel(status: string | undefined): string {
  if (status === 'draft') return 'Brouillon';
  if (status === 'published') return 'Publié';
  if (status === 'pending') return 'En attente de validation';
  if (status === 'rejected') return 'Refusé';
  return status ?? '';
}
