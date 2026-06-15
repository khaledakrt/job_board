# Tests Production Candidate

Ce dossier contient l'audit et les tests dedies au role `candidate`.

Il ne remplace pas les tests existants dans `tests/e2e`; il ajoute une suite isolee pour analyser et verifier le parcours candidat.

## Contenu

- `reports/AUDIT_GLOBAL_CANDIDATE.md`: audit front/back/base/API.
- `reports/MATRICE_PERMISSIONS_CANDIDATE.md`: matrice permissions candidate.
- `reports/RAPPORT_FINAL_CANDIDATE.md`: rapport final, risques et couverture.
- `unit/candidate-validators.test.js`: tests unitaires des validateurs backend candidate.
- `integration/candidate-read-workflow.test.js`: workflow API read-only candidate.
- `api/candidate-api.test.js`: tests API Jest + Supertest.
- `security/candidate-security.test.js`: tests securite non destructifs.
- `e2e/*.spec.ts`: tests Playwright candidate.
- `playwright.candidate.config.ts`: config Playwright isolee.
- `jest.candidate.config.cjs`: config Jest isolee.
- `fixtures/candidate-env.example`: variables utiles.

## Installation

Depuis la racine:

```powershell
cd D:\khaled\Cursor
npm install
npm run test:install-browsers
cd backend
npm install
cd ..
```

`jest` et `supertest` sont installes dans `backend`.

## Configuration

Remplir `tests/e2e/prod.env`:

```env
E2E_BASE_URL=https://tun-job-board.com
E2E_API_URL=https://tun-job-board.com/api

TEST_CANDIDATE_EMAIL=candidate-recette@example.com
TEST_CANDIDATE_PASSWORD=Test1234!
TEST_CANDIDATE_SIGNUP_INBOX=kh.akrout91@gmail.com

E2E_ALLOW_CANDIDATE_MUTATIONS=false
```

Si tu utilises `TEST_PASSWORD` commun:

```env
TEST_CANDIDATE_EMAIL=candidate-recette@example.com
TEST_PASSWORD=Test1234!
```

## Commandes

Tous les tests candidate:

```powershell
npm run test:prod:candidate
```

API/Jest uniquement:

```powershell
npm run test:prod:candidate:api
```

E2E uniquement:

```powershell
npm run test:prod:candidate:e2e
```

Mode navigateur visible:

```powershell
npm run test:prod:candidate:e2e -- --headed
```

Lister sans executer:

```powershell
npm run test:prod:candidate:e2e -- --list
```

Rapport Playwright:

```powershell
npx playwright show-report test-results\candidate-playwright-report
```

## Tests Mutants / Creation De Donnees

Par defaut:

```env
E2E_ALLOW_CANDIDATE_MUTATIONS=false
```

Dans ce mode, les tests ne creent pas de compte reel et ne modifient pas le profil.

Pour tester la creation reelle d'un compte candidat:

```env
E2E_ALLOW_CANDIDATE_MUTATIONS=true
TEST_ACCOUNT_CREATION_PASSWORD=Test1234!
TEST_CANDIDATE_SIGNUP_INBOX=kh.akrout91@gmail.com
```

Important: la verification e-mail ne peut pas etre automatisee en production sans acces a la boite mail de test ou au token de confirmation.

Avec Gmail, les tests creent une adresse unique de type:

```text
kh.akrout91+candidate-123456@gmail.com
```

Le mail arrive quand meme dans:

```text
kh.akrout91@gmail.com
```

Si tu recuperes un token de confirmation:

```env
TEST_CANDIDATE_VERIFY_TOKEN=token_recu_par_email
```

## Parcours Couvert

- Inscription candidate: validations + creation non verifiee en mode mutation.
- Login invalide et login candidate verifie.
- Blocage login si e-mail non verifie.
- Verification e-mail par token si fourni.
- Lecture dashboard candidate.
- Lecture jobs, saved jobs, applications, alerts, notifications.
- Profil: pages, photo, etapes, bouton generation CV PDF.
- Settings: validations e-mail/mot de passe.
- API: auth, endpoints protected, profile validation, read candidate collections.

## Limites Connues

- Le test ne lit pas automatiquement la boite mail.
- Les tests de postulation complete exigent une offre de recette active et un candidat avec CV.
- Les tests upload avatar/CV reels sont volontairement a activer plus tard avec donnees de recette dediees.
