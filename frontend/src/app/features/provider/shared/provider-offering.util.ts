export function offeringStatusClass(status: string | undefined): string {
  if (status === 'published') return 'provider-badge provider-badge--published';
  if (status === 'rejected') return 'provider-badge provider-badge--rejected';
  if (status === 'draft') return 'provider-badge';
  return 'provider-badge provider-badge--pending';
}

export function accountStatusLabel(status: string): string {
  if (status === 'published') return 'Compte validé — visible sur le site';
  if (status === 'pending') return 'En attente de validation administrateur';
  if (status === 'rejected') return 'Demande refusée';
  return status;
}
