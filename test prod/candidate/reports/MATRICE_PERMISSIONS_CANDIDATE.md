# Matrice Permissions Candidate

## Ressources Candidate

| Ressource | Voir | Creer | Modifier | Supprimer | Publier | Approuver/Rejeter |
|---|---|---|---|---|---|---|
| Compte candidat | Propre compte | Inscription publique | E-mail/mot de passe propres | Non expose UI | Non | Non |
| Profil candidat | Propre profil | Propre profil | Propre profil | Propre profil si aucune candidature | Non | Non |
| Avatar | Propre profil | Upload propre avatar | Remplacer propre avatar | Via remplacement/suppression profil | Non | Non |
| CV PDF | Propre CV protege | Generation depuis profil | Regeneration depuis profil | Via suppression profil/remplacement | Non | Non |
| Jobs publics | Offres actives publiques | Non | Non | Non | Non | Non |
| Candidature | Propres candidatures | Postuler a une offre active | Reponse entretien, archive refusee | Non suppression definitive | Non | Non |
| Snapshot CV | Snapshot de ses candidatures | Cree automatiquement a la postulation | Non | Non | Non | Non |
| Offre sauvegardee | Propres sauvegardes | Sauvegarder offre active | Non | Retirer sauvegarde | Non | Non |
| Alerte emploi | Propres alertes | Creer alerte | Modifier frequence/label/actif | Supprimer alerte | Non | Non |
| Notifications | Propres notifications | Cree par systeme | Marquer lue/tout lu | Non | Non | Non |
| Formations/events publics | Voir catalogue public | Participer si endpoint public l'autorise | Non | Non | Non | Non |
| Etablissements/publications | Voir catalogue public | Participer/interet si endpoint public l'autorise | Non | Non | Non | Non |

## Permissions Backend

| Endpoint | Auth | Role | Profil requis | Remarque |
|---|---|---|---|---|
| `POST /auth/register` | Non | Public | Non | Role limite a candidate/recruiter |
| `POST /auth/login` | Non | Public | Non | Candidate bloque si non verifie |
| `POST /auth/verify-email` | Non | Public | Non | Token obligatoire |
| `PATCH /auth/change-password` | Oui | Tous roles auth | Non | Invalide sessions |
| `PATCH /auth/change-email` | Oui | Tous roles auth | Non | Invalide sessions et exige re-verification |
| `GET /candidate/profile` | Oui | Candidate | Non | Retourne null si pas de profil |
| `POST /candidate/profile` | Oui | Candidate | Non | `firstName` obligatoire |
| `PUT /candidate/profile` | Oui | Candidate | Oui | Update JSON profile/preferences |
| `DELETE /candidate/profile` | Oui | Candidate | Oui | Bloque si historique candidatures |
| `PUT /candidate/profile/avatar` | Oui | Candidate | Oui | Upload image seulement |
| `POST /candidate/resume/parse` | Oui | Candidate | Oui | Upload PDF |
| `POST /candidate/resume/generate-pdf` | Oui | Candidate | Oui | Genere resume URL |
| `POST /jobs/:id/apply` | Oui | Candidate | Oui | Resume requis |
| `GET /candidate/applications` | Oui | Candidate | Candidate optionnel | Liste vide si pas profil |
| `GET /candidate/applications/:id` | Oui | Candidate | Oui | Own application only |
| `PATCH /candidate/applications/:id/archive` | Oui | Candidate | Oui | Rejected only |
| `PATCH /candidate/applications/:id/interview-response` | Oui | Candidate | Oui | Interview only |
| `GET /candidate/saved-jobs` | Oui | Candidate | Candidate optionnel | Liste vide si pas profil |
| `POST /candidate/saved-jobs` | Oui | Candidate | Oui | Max 10 |
| `GET /candidate/job-alerts` | Oui | Candidate | Candidate optionnel | Liste vide si pas profil |
| `POST /candidate/job-alerts` | Oui | Candidate | Oui | Max 5 |
| `GET /candidate/notifications` | Oui | Candidate | Candidate optionnel | Query `limit` a renforcer |

## Risques Permission Detectes

- Les endpoints candidate sont globalement bien proteges par `authenticate` + `requireCandidateRole`.
- Acces detail candidature limite par `candidate_id`, correct.
- Fichiers CV/snapshots proteges via API, correct en intention.
- Point a renforcer: validation query notifications.
- Point a tester fortement: candidat A ne doit jamais lire candidature/CV/snapshot candidat B.
- Point a tester fortement: recruiter ne doit pas lire resume brut candidat, seulement snapshot autorise.
