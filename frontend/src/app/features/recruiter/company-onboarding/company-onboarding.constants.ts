export const LEGAL_FORMS = [
  { value: '', label: '— Sélectionner —' },
  { value: 'SAS', label: 'SAS' },
  { value: 'SASU', label: 'SASU' },
  { value: 'SARL', label: 'SARL' },
  { value: 'EURL', label: 'EURL' },
  { value: 'SA', label: 'SA' },
  { value: 'SNC', label: 'SNC' },
  { value: 'EI', label: 'Entreprise individuelle' },
  { value: 'Association', label: 'Association' },
  { value: 'Autre', label: 'Autre' },
] as const;

export const COMPANY_SIZES = [
  { value: '', label: '— Sélectionner —' },
  { value: '1-10', label: '1 – 10 employés' },
  { value: '11-50', label: '11 – 50 employés' },
  { value: '51-200', label: '51 – 200 employés' },
  { value: '201-500', label: '201 – 500 employés' },
  { value: '500+', label: 'Plus de 500 employés' },
] as const;

export const INDUSTRIES = [
  { value: '', label: '— Sélectionner —' },
  { value: 'Technologie / IT', label: 'Technologie / IT' },
  { value: 'RH & Recrutement', label: 'RH & Recrutement' },
  { value: 'Finance & Assurance', label: 'Finance & Assurance' },
  { value: 'Santé', label: 'Santé' },
  { value: 'Industrie', label: 'Industrie' },
  { value: 'Commerce & Distribution', label: 'Commerce & Distribution' },
  { value: 'Conseil & Services', label: 'Conseil & Services' },
  { value: 'Éducation & Formation', label: 'Éducation & Formation' },
  { value: 'Immobilier & Construction', label: 'Immobilier & Construction' },
  { value: 'Média & Communication', label: 'Média & Communication' },
  { value: 'Transport & Logistique', label: 'Transport & Logistique' },
  { value: 'Hôtellerie & Restauration', label: 'Hôtellerie & Restauration' },
  { value: 'Énergie & Environnement', label: 'Énergie & Environnement' },
  { value: 'Public & Associatif', label: 'Public & Associatif' },
  { value: 'Autre', label: 'Autre' },
] as const;
