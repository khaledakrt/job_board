# Audit Global Candidate

Audit base uniquement sur le code existant.

## Frontend

Routes candidate detectees dans `frontend/src/app/features/candidate/candidate.routes.ts`:

- `/candidate/dashboard`: suivi candidatures, stats, recommandations, offres sauvegardees, alertes, notifications.
- `/candidate/jobs`: recherche emploi, filtres, detail offre, sauvegarde, alerte, postulation, quiz, lettre IA.
- `/candidate/saved`: offres sauvegardees et alertes emploi.
- `/candidate/profile`: profil candidat en 4 etapes, photo, experiences, formation, preferences, generation CV PDF.
- `/candidate/settings`: notifications, changement e-mail, changement mot de passe.
- `/candidate/annuaire-societes`: annuaire entreprises.
- `/candidate/annuaire-formations`: annuaire formations.
- `/candidate/annuaire-etablissements`: annuaire etablissements.

Composants principaux:

- `CandidateLayoutComponent`
- `TrackingDashboardComponent`
- `JobSearchComponent`
- `SavedJobsPageComponent`
- `ProfileStepperComponent`
- `CandidateDirectoryComponent`
- `CandidateNotificationBellComponent`
- `SettingsComponent`

Services frontend candidate:

- `CandidateContextService`: charge/propage le profil, progression, onboarding.
- `CandidateProfileService`: profile CRUD, avatar, resume parse, generation PDF.
- `CandidateJobService`: recherche, detail, apply, lettre IA.
- `CandidateApplicationsService`: liste, detail, archive refusee, reponse entretien.
- `CandidateSavedJobsService`: sauvegarde/suppression offres.
- `CandidateJobAlertsService`: alertes emploi.
- `CandidateDashboardService`: stats/recommandations.
- `CandidateNotificationService`: notifications.
- `ProtectedFileService`: ouverture CV/snapshot protege.

## Backend

Routes candidate detectees:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/verify-email`
- `POST /api/auth/resend-verification`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `PATCH /api/auth/change-password`
- `PATCH /api/auth/change-email`
- `GET|POST|PUT|DELETE /api/candidate/profile`
- `PUT /api/candidate/profile/avatar`
- `POST /api/candidate/resume/parse`
- `POST /api/candidate/resume/generate-pdf`
- `GET /api/jobs`
- `GET /api/jobs/:id`
- `POST /api/jobs/:id/apply`
- `GET /api/candidate/applications`
- `GET /api/candidate/applications/applied-job-ids`
- `GET /api/candidate/applications/:id`
- `PATCH /api/candidate/applications/:id/archive`
- `PATCH /api/candidate/applications/:id/interview-response`
- `POST /api/candidate/applications/generate-letter`
- `GET|POST|DELETE /api/candidate/saved-jobs`
- `GET|POST|PATCH|DELETE /api/candidate/job-alerts`
- `GET /api/candidate/dashboard/summary`
- `GET /api/candidate/dashboard/recommended-jobs`
- `GET /api/candidate/dashboard/recruiter-preview`
- `GET /api/candidate/notifications`
- `GET /api/candidate/notifications/unread-count`
- `PATCH /api/candidate/notifications/read-all`
- `PATCH /api/candidate/notifications/:id/read`

## Base De Donnees

Tables candidate principales:

- `users`: email, password hash, role, verification token, reset token, session version, ban state.
- `candidate_profiles`: profil unique par user, resume, avatar, preferences, JSON profile data.
- `applications`: candidatures, statut, quiz, snapshot CV, entretien, archive candidat.
- `saved_jobs`: offres sauvegardees, unique candidate/job.
- `job_alerts`: criteres recherche, frequence weekly/monthly, actif.
- `candidate_notifications`: notifications in-app.
- `refresh_sessions`: refresh token rotation et invalidation session.

Relations importantes:

- `User` 1-1 `CandidateProfile`.
- `CandidateProfile` 1-N `Application`.
- `CandidateProfile` 1-N `SavedJob`.
- `CandidateProfile` 1-N `JobAlert`.
- `CandidateProfile` 1-N `CandidateNotification`.
- `Job` 1-N `Application`.
- `Job` 1-N `SavedJob`.

## Regles Metier Candidate

- Inscription candidate cree un user `is_verified=false`.
- Login candidate refuse si e-mail non verifie.
- Changement e-mail remet `is_verified=false` et invalide les sessions.
- Changement mot de passe invalide les sessions.
- Postuler exige un profil candidat et un `resume_url`.
- Postuler refuse une offre inactive/expiree.
- Postuler refuse les doublons.
- Quiz obligatoire si offre avec quiz.
- CV candidat est copie en snapshot au moment de la candidature.
- Offre sauvegardee limitee a 10.
- Alertes emploi limitees a 5.
- Candidature refusee peut etre archivee cote candidate.
- Reponse entretien possible uniquement si statut `interview` et date entretien.
- Demande reprogrammation entretien exige un message.
- Limite reprogrammation: `interview_round >= 3` bloque une nouvelle demande.

## Bugs / Risques Detectes

- `CandidateProfileService.parseResume()` existe mais l'UI profile n'expose pas vraiment un import CV PDF manuel; le texte indique "ajoutez votre CV", mais le parcours principal genere un PDF depuis le profil.
- `candidateNotification.controller.js` lit `limit` sans validation Zod stricte; risque valeurs negatives/NaN/non bornees.
- `candidateSavedJob.service.js` verifie le statut public mais pas explicitement `expires_at`; une offre `active` stale mais expiree pourrait etre sauvegardee.
- i18n candidate incomplet: profile, directory, notifications et settings contiennent beaucoup de texte FR hardcode.
- Changement e-mail/mot de passe invalide la session; l'UI affiche un succes mais l'utilisateur sera redirige/reconnecte selon AuthService.
- Notes recruiter visibles candidate ne passent pas par `addApplicationNote`; elles passent surtout via `evaluationText` lors de changement de statut.
