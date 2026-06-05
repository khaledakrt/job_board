import { InstitutionType, TrainingDeliveryMode } from '../../../core/models/catalog.model';

export const TRAINING_DELIVERY_OPTIONS: { value: TrainingDeliveryMode | ''; label: string }[] = [
  { value: '', label: 'Tous les modes' },
  { value: 'online', label: 'En ligne' },
  { value: 'onsite', label: 'Présentiel' },
  { value: 'hybrid', label: 'Hybride' },
];

export const INSTITUTION_TYPE_OPTIONS: { value: InstitutionType | ''; label: string }[] = [
  { value: '', label: 'Tous les types' },
  { value: 'primary', label: 'École primaire' },
  { value: 'college', label: 'Collège' },
  { value: 'high_school', label: 'Lycée' },
  { value: 'higher_institute', label: 'Institut supérieur' },
  { value: 'university', label: 'Université' },
  { value: 'academy', label: 'Académie' },
];

export function institutionTypeLabel(type: InstitutionType): string {
  return INSTITUTION_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

export function deliveryModeLabel(mode: TrainingDeliveryMode | null | undefined): string {
  if (!mode) return '';
  return TRAINING_DELIVERY_OPTIONS.find((o) => o.value === mode)?.label ?? mode;
}
