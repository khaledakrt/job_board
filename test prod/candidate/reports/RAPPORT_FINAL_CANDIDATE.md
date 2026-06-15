# Rapport Final Candidate

## Fonctionnalites Detectees

- Auth candidate: inscription, verification e-mail, login, forgot/reset password, changement e-mail, changement mot de passe.
- Workspace candidate: dashboard, jobs, saved, profile, settings, annuaires.
- Profil: creation, update, avatar, experiences, education, skills, languages, certifications, preferences, generation CV PDF.
- Jobs: recherche, filtres, detail, sauvegarde, postulation, quiz, lettre IA.
- Candidatures: liste, detail, statuts, timeline, archive refusee, reponse entretien.
- Notifications: liste, unread count, mark read, mark all read.
- Alertes emploi: create/update/delete, weekly/monthly, active/inactive.
- Fichiers proteges: CV et snapshots via API protegee.

## Tests Generes

API Jest/Supertest:

- `unit/candidate-validators.test.js`
  - create profile exige `firstName`.
  - payload profil structure accepte.
  - preferences notifications seules acceptees en update.
  - generation letter exige UUID.
  - apply payload normalise cover letter vide.

- `integration/candidate-read-workflow.test.js`
  - login candidate verifie.
  - chargement jobs publics.
  - chargement profile/dashboard/applications/saved/alerts.

- `api/candidate-api.test.js`
  - login invalide.
  - validation inscription mot de passe faible.
  - creation compte candidat non verifie en mode mutation.
  - login bloque avant verification e-mail.
  - verification token invalide.
  - forgot password non enumerant.
  - endpoints candidate anonymes refuses.
  - lecture endpoints candidate avec compte verifie.
  - validation `firstName` profile.
  - update preferences notifications en mode mutation.

- `security/candidate-security.test.js`
  - JWT forge refuse.
  - Authorization header malforme refuse.
  - recherche jobs avec payload SQLi ne cause pas 500.
  - recherche jobs avec payload XSS ne reflete pas le script brut.
  - path traversal uploads proteges refuse.

E2E Playwright:

- `e2e/candidate-auth-profile.spec.ts`
  - validation formulaire inscription.
  - creation compte non verifie en mode mutation.
  - verification e-mail par token si fourni.
  - pages candidate principales.
  - profil candidat: etapes, photo, generation PDF visible.
  - settings: validations e-mail/mot de passe.

- `e2e/candidate-jobs-dashboard.spec.ts`
  - recherche emploi et filtres.
  - dashboard suivi candidatures.
  - saved jobs vs alerts.
  - notification bell.

## Fonctionnalites Non Encore Automatisees

- Lecture automatique de l'e-mail de verification.
- Upload reel avatar avec fichier fixture image.
- Upload/parse CV PDF reel.
- Postulation complete sur une offre de recette active.
- Postulation avec quiz reel.
- Archive d'une candidature refusee reelle.
- Reponse entretien reelle avec limite 3 echanges.
- Acces snapshot CV candidat A vs candidat B.
- Tests DB directs de contraintes/cascades.

Ces tests demandent des donnees de recette controlees: candidat verifie, offre active, offre avec quiz, candidature interview, candidature rejected, fichiers fixtures.

## Bugs / Risques Potentiels

- Import CV PDF: service backend/frontend existe (`parseResume`) mais l'UI profile ne propose pas clairement l'upload CV manuel; le parcours reel genere surtout un PDF depuis le profil.
- Notifications candidate: query `limit` a renforcer cote backend.
- Saved jobs: sauvegarde possible d'une offre active stale si `expires_at` n'est pas revalide.
- i18n candidate incomplet.
- Changement e-mail/password invalide session; UX a verifier car le succes peut etre court avant redirection.

## Recommandations

- Creer des comptes de recette dedies:
  - candidate sans profil.
  - candidate avec profil complet + CV.
  - candidate avec candidatures applied/interview/rejected.
- Ajouter une seed recette non production pour generer:
  - offre active sans quiz.
  - offre active avec quiz.
  - candidature interview round 1/2/3.
  - candidature rejected.
- Ajouter un mecanisme test-only pour recuperer verification token en local/staging, jamais en prod publique.
- Ajouter validation Zod sur query notifications.
- Ajouter test upload avec fichiers fixtures image/PDF.
