# Commandes Candidate

Depuis la racine:

```powershell
cd D:\khaled\Cursor
```

## Installation

```powershell
npm install
npm run test:install-browsers
cd backend
npm install
cd ..
```

## Tous les tests candidate

```powershell
npm run test:prod:candidate
```

## API / Integration / Unit / Security Jest + Supertest

```powershell
npm run test:prod:candidate:api
```

Lister les tests Jest:

```powershell
npm run test:prod:candidate:api -- --listTests
```

Lancer un seul fichier:

```powershell
backend\node_modules\.bin\jest.cmd --config "test prod/candidate/jest.candidate.config.cjs" "test prod/candidate/security/candidate-security.test.js"
```

## E2E Playwright

```powershell
npm run test:prod:candidate:e2e
```

Mode visible:

```powershell
npm run test:prod:candidate:e2e -- --headed
```

Lister sans executer:

```powershell
npm run test:prod:candidate:e2e -- --list
```

## Activer Les Tests Qui Creent/Modifient

Dans `tests/e2e/prod.env`:

```env
E2E_ALLOW_CANDIDATE_MUTATIONS=true
```

Puis:

```powershell
npm run test:prod:candidate
```

Ne pas activer sur un compte reel client. Utiliser un compte de recette.
