# Tests Job Board

Ce dossier contient les tests transverses du projet. Ils sont placés à la racine parce qu'ils vérifient le frontend et le backend ensemble.

## Structure

```text
tests/
  smoke/      Tests rapides API + pages importantes
  e2e/        Tests navigateur Playwright
  fixtures/  Comptes et routes de test
```

## Préparer Le Local

Depuis la racine du projet :

```bash
cd backend
npm run db:migrate
npm run db:seed
npm run db:seed:jobs
```

Démarrer ensuite :

```bash
cd backend
npm run dev
```

Dans un autre terminal :

```bash
cd frontend
npm start
```

## Smoke Test Local

Depuis la racine :

```bash
npm run test:smoke:local
```

Ce test vérifie :

- pages publiques Angular
- `/api/health`
- endpoints publics offres/catalogue
- login candidat/recruteur/admin avec les comptes seed
- endpoints dashboard principaux

Comptes seed par défaut :

```text
candidate@test.com / Test1234!
recruiter@test.com / Test1234!
admin@test.com / Test1234!
```

Pour désactiver les logins :

```bash
SMOKE_WITH_LOGINS=false npm run test:smoke:local
```

## Smoke Test Production

Le smoke prod est volontairement non destructif. Par défaut, il ne fait pas de login.

```bash
npm run test:smoke:prod
```

Pour tester les logins avec des comptes de test en prod :

```bash
SMOKE_WITH_LOGINS=true npm run test:smoke:prod
```

Tu peux changer les URLs :

```bash
FRONTEND_URL=https://tun-job-board.com API_URL=https://tun-job-board.com/api npm run test:smoke:prod
```

## Tests E2E Playwright

Installer les navigateurs Playwright une seule fois :

```bash
npm run test:install-browsers
```

Lancer les tests :

```bash
npm run test:e2e
```

La suite actuelle contient des tests non destructifs pour :

- pages publiques principales
- catalogue public centres et établissements
- page de recherche offres
- pages auth login/register
- guards anonymes et mauvais rôles
- espace candidat : dashboard, recherche, favoris, profil, paramètres
- espace recruteur : dashboard, entreprise, offres, ATS, équipe, paramètres
- espace admin : dashboard, utilisateurs, offres, centres, établissements, publications, formations, événements

Résultat attendu actuellement :

```text
35 passed
```

Mode visible :

```bash
npm run test:e2e:headed
```

Mode interface Playwright :

```bash
npm run test:e2e:ui
```

Changer l'URL de test :

```bash
E2E_BASE_URL=http://localhost:4200 npm run test:e2e
```

## Règles

- Les tests E2E actuels sont non destructifs.
- Ne pas lancer de tests destructifs sur la production.
- Utiliser une base staging pour les parcours complets qui créent/suppriment des données.
- Après chaque déploiement prod, lancer d'abord `npm run test:smoke:prod`.
