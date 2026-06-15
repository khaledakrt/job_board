# Plan de test automatique production

Ce document décrit la procédure de recette automatique pour tester `https://tun-job-board.com` depuis un PC, avec Playwright.

## Objectif

Vérifier régulièrement que les parcours principaux du site fonctionnent en production:

- pages publiques;
- authentification;
- accès par rôle;
- parcours candidat;
- parcours recruteur;
- entretien candidat/recruteur;
- admin;
- providers formation/institution;
- abonnement;
- permissions et sécurité fonctionnelle.

## Principe de sécurité

Les tests production sont séparés en deux familles.

### 1. Smoke prod non destructif

Ce test ne crée pas et ne modifie pas de données.

Il vérifie:

- API `/health`;
- pages publiques principales;
- redirection des espaces protégés vers login;
- login des rôles si les comptes de test sont configurés.

Commande:

```powershell
npm run test:e2e:prod:smoke
```

### 2. Recette prod complète

Ces tests peuvent créer ou modifier des données test. Ils doivent utiliser uniquement des comptes dédiés et des objets préfixés:

```text
[E2E PROD] ...
```

Ils ne doivent être lancés que si:

```env
E2E_ALLOW_PROD_MUTATIONS=true
```

## Préparation sur PC

Installer les dépendances racine si nécessaire:

```powershell
npm install
npm run test:install-browsers
```

Créer le fichier de configuration local:

```powershell
Copy-Item tests/e2e/prod.env.example tests/e2e/prod.env
```

Renseigner `tests/e2e/prod.env`:

```env
E2E_BASE_URL=https://tun-job-board.com
E2E_API_URL=https://tun-job-board.com/api
E2E_WITH_ROLE_LOGINS=true

TEST_PASSWORD=...
TEST_CANDIDATE_EMAIL=candidate.e2e@tun-job-board.com
TEST_RECRUITER_EMAIL=recruiter.owner.e2e@tun-job-board.com
TEST_ADMIN_EMAIL=admin.e2e@tun-job-board.com
```

Ne jamais committer `tests/e2e/prod.env`.

## Comptes recommandés

Créer des comptes dédiés:

```text
candidate.e2e@tun-job-board.com
recruiter.owner.e2e@tun-job-board.com
recruiter.member.e2e@tun-job-board.com
formation.provider.e2e@tun-job-board.com
institution.provider.e2e@tun-job-board.com
admin.e2e@tun-job-board.com
```

Les comptes doivent rester stables, avec un mot de passe connu de recette.

## Commandes

Smoke prod headless:

```powershell
npm run test:e2e:prod:smoke
```

Smoke prod avec navigateur visible:

```powershell
npm run test:e2e:prod:smoke:headed
```

Smoke API historique:

```powershell
$env:SMOKE_WITH_LOGINS="true"
npm run test:smoke:prod
```

Rapport Playwright:

```powershell
npx playwright show-report test-results/playwright-report
```

## Procédure de recette complète

### Phase 1 - Public

Vérifier:

- accueil;
- offres;
- détail offre;
- centres de formation;
- établissements privés;
- changement FR/EN;
- responsive desktop/mobile.

### Phase 2 - Authentification

Pour chaque rôle:

- login;
- logout;
- refresh après login;
- mauvais rôle interdit;
- mot de passe oublié.

Rôles:

- candidat;
- recruteur owner;
- recruteur membre;
- admin;
- provider formation;
- provider institution.

### Phase 3 - Candidat

Tester:

- profil candidat;
- CV;
- recherche offre;
- sauvegarde offre;
- alerte emploi;
- postuler;
- tableau de bord;
- détail candidature;
- notification de changement statut;
- entretien;
- confirmer présence;
- demander autre créneau;
- limite 3 échanges;
- refus;
- masquer/archive candidature refusée.

### Phase 4 - Recruteur

Tester:

- profil entreprise;
- logo;
- visibilité email/téléphone public/privé;
- créer offre;
- publier offre;
- modifier offre;
- masquer/archive offre;
- ATS Kanban;
- ATS liste;
- changer statut candidature;
- proposer entretien;
- lire réponse candidat;
- révéler téléphone candidat au clic;
- contacter par email;
- reproposer une date;
- limite 3 échanges;
- refuser candidature;
- archives;
- restaurer candidature.

### Phase 5 - Équipe recruteur

Tester:

- owner voit tout;
- membre sans `can_decide_application` ne voit pas ATS/notifications candidature;
- membre sans `can_post_job` ne peut pas publier;
- membre sans `can_edit_company` ne peut pas modifier entreprise.

### Phase 6 - Admin

Tester:

- dashboard;
- utilisateurs;
- entreprises;
- détails utilisateur;
- offres;
- candidatures;
- providers;
- modération;
- paramètres abonnement;
- paiements abonnement.

### Phase 7 - Providers

Formation:

- profil centre;
- formation;
- événement;
- publication;
- affichage public;
- participants.

Institution:

- profil établissement;
- offre/programme;
- publication;
- affichage public;
- demandes/participants.

### Phase 8 - Abonnement

Tester:

- mode `free_all`;
- mode `paid_required`;
- publication bloquée sans abonnement;
- paiement visible uniquement en mode payant;
- paiement réservé au propriétaire;
- limite `max_active_jobs`.

### Phase 9 - Sécurité fonctionnelle

Tester:

- candidat interdit sur recruteur/admin;
- recruteur interdit sur admin;
- provider interdit sur espaces candidat/recruteur;
- CV protégés;
- notifications recruteur protégées;
- refresh token/session.

## Nettoyage après recette complète

Nettoyer tous les objets préfixés:

```text
[E2E PROD]
```

À vérifier:

- offres test masquées/supprimées;
- candidatures test archivées;
- alertes test supprimées;
- providers test nettoyés;
- mode abonnement remis à la valeur souhaitée;
- `/api/health` OK.

## Stratégie d'automatisation progressive

Priorité 1:

- smoke prod non destructif;
- login par rôle;
- pages protégées principales.

Priorité 2:

- scénario entretien complet avec comptes dédiés;
- permissions équipe recruteur;
- refus + archive candidat.

Priorité 3:

- providers;
- abonnement;
- nettoyage automatique.

## Règles importantes

- Ne jamais utiliser de vrais comptes clients pour les tests automatiques.
- Ne jamais lancer de test destructif sans `E2E_ALLOW_PROD_MUTATIONS=true`.
- Toujours préfixer les données créées avec `[E2E PROD]`.
- Toujours vérifier le rapport Playwright si un test échoue.
