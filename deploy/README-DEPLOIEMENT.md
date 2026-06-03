# Déploiement VM — Job Board (guide organisé)

Dépôt : [github.com/khaledakrt/job_board](https://github.com/khaledakrt/job_board)

---

## Vue d’ensemble

| Étape | Script | Rôle |
|-------|--------|------|
| 1 | `scripts/01-install-system.sh` | Node 20, Git, PM2 |
| 2 | `scripts/02-setup-mysql.sh` | MySQL + base `job_board` |
| 3 | `scripts/03-clone-project.sh` | `git clone` / `git pull` |
| 4 | `scripts/04-init-env.sh` | Crée `backend/.env` |
| 5 | `scripts/05-deploy-backend.sh` | npm + migrations + seed |
| 6 | `scripts/06-deploy-frontend.sh` | Build Angular → `site/` |
| 7 | `scripts/07-start-pm2.sh` | API en arrière-plan |
| 8 | `scripts/08-nginx-aapanel.sh` | Nginx aaPanel (VPS avec panel) |
| 8b | `scripts/08-nginx-standalone.sh` | Nginx classique (sans aaPanel) |

**Tout-en-un :** `deploy/deploy.sh`  
**Mise à jour :** `deploy/update.sh`

---

## Méthode rapide (recommandée)

### Sur votre PC

```powershell
cd d:\khaled\Cursor
git add .
git commit -m "Vos changements"
git push
```

### Sur la VM (SSH)

```bash
ssh root@VOTRE_IP

mkdir -p /var/www/jobboard
cd /var/www/jobboard

# Si premier déploiement : cloner d'abord
git clone https://github.com/khaledakrt/job_board.git .

# Variables (à adapter)
export PUBLIC_URL=http://5.189.190.131
export SERVER_NAME=5.189.190.131
export DB_PASSWORD='MotDePasseDB_Securise'
export USE_AAPANEL=yes

chmod +x deploy/deploy.sh deploy/scripts/*.sh
sudo -E bash deploy/deploy.sh
```

Ouvrir dans le navigateur : `http://VOTRE_IP`

---

## Méthode étape par étape (manuelle)

### Étape 0 — Prérequis

- VM Ubuntu 22/24, accès root SSH
- Ports **80** et **443** ouverts
- aaPanel installé → utiliser étape 8 aaPanel

---

### Étape 1 — Système

```bash
sudo bash deploy/scripts/01-install-system.sh
```

---

### Étape 2 — MySQL

```bash
export DB_PASSWORD='MotDePasseDB_Securise'
sudo -E bash deploy/scripts/02-setup-mysql.sh
```

Vérification :

```bash
mysql -u jobboard -p -e "SHOW DATABASES;"
```

---

### Étape 3 — Code source

```bash
export APP_ROOT=/var/www/jobboard
bash deploy/scripts/03-clone-project.sh
```

---

### Étape 4 — Fichier `.env`

```bash
export PUBLIC_URL=http://5.189.190.131
export DB_PASSWORD='MotDePasseDB_Securise'
bash deploy/scripts/04-init-env.sh
nano /var/www/jobboard/backend/.env   # SMTP, etc.
```

Modèle : `deploy/env.production.example`

---

### Étape 5 — Backend

```bash
bash deploy/scripts/05-deploy-backend.sh
```

Comptes de test :

| Email | Mot de passe |
|-------|----------------|
| candidate@test.com | Test1234! |
| recruiter@test.com | Test1234! |

---

### Étape 6 — Frontend

```bash
bash deploy/scripts/06-deploy-frontend.sh
```

Fichiers publiés dans : `/var/www/jobboard/site`

---

### Étape 7 — PM2 (API)

```bash
bash deploy/scripts/07-start-pm2.sh
pm2 list
```

Test :

```bash
curl http://127.0.0.1:3000/api/health
```

---

### Étape 8 — Nginx

**Avec aaPanel (votre cas type PVS) :**

```bash
export SERVER_NAME=5.189.190.131
sudo -E bash deploy/scripts/08-nginx-aapanel.sh
```

**Sans aaPanel :**

```bash
export SERVER_NAME=5.189.190.131
sudo -E bash deploy/scripts/08-nginx-standalone.sh
```

Test public :

```bash
curl http://5.189.190.131/api/health
```

---

## Architecture

```text
Navigateur
    │
    ▼
Nginx (aaPanel) :80
    ├── /           →  /var/www/jobboard/site   (Angular)
    ├── /api/       →  127.0.0.1:3000          (PM2 jobboard-api)
    └── /uploads/   →  127.0.0.1:3000
```

---

## Développement local → production

Flux habituel : coder sur votre PC, pousser sur GitHub, mettre à jour la VM.

### 1. Environnement local (une fois)

```powershell
cd d:\khaled\Cursor

# Backend
copy backend\.env.example backend\.env
# Éditer backend\.env : MySQL local, CLIENT_URL=http://localhost:4200

cd backend
npm install
npm run db:setup
npm run db:seed

# Frontend (autre terminal)
cd ..\frontend
npm install
```

### 2. Travailler au quotidien

Terminal 1 — API :

```powershell
cd d:\khaled\Cursor\backend
npm run dev
```

Terminal 2 — Angular :

```powershell
cd d:\khaled\Cursor\frontend
npm start
```

Ouvrir **http://localhost:4200** (le front appelle **http://localhost:3000/api** via `environment.ts`).

| Local | Production |
|-------|------------|
| `frontend/src/environments/environment.ts` | `environment.prod.ts` → `apiUrl: '/api'` |
| `backend/.env` (votre PC) | `backend/.env` sur la VM uniquement |
| MySQL local | MySQL `job_board` sur la VM |

**Ne jamais committer** `backend/.env` (secrets, mots de passe prod).

### 3. Envoyer les changements

```powershell
cd d:\khaled\Cursor
git status
git add .
git commit -m "Description de vos modifs"
git push
```

### 4. Appliquer sur la VM

```bash
ssh root@5.189.190.131
cd /var/www/jobboard
sudo bash deploy/update.sh
```

Ce script fait : `git pull` → dépendances backend → migrations → build Angular **production** → copie vers `site/` → `pm2 restart jobboard-api`.

Vérifier :

```bash
curl http://127.0.0.1:3000/api/health
```

Puis dans le navigateur : **http://5.189.190.131/**

### Cas particuliers

| Vous avez modifié… | Action prod |
|--------------------|-------------|
| Frontend seulement | `update.sh` suffit |
| Backend seulement | `update.sh` (ou `git pull` + `cd backend && npm ci` + `pm2 restart jobboard-api`) |
| Nouvelles tables / migrations SQL | `update.sh` lance `db:migrate` automatiquement |
| Variables `.env` (SMTP, URL…) | Éditer **sur la VM** : `nano backend/.env` puis `pm2 restart jobboard-api` (pas dans git) |
| Seed / données de test | **Ne pas** relancer `db:seed` en prod si la base a déjà des vrais utilisateurs |

### Schéma du flux

```text
PC (dev)                    GitHub                    VM (prod)
────────                    ──────                    ─────────
npm run dev          →      git push           →      git pull
npm start (4200)            job_board repo            update.sh
backend/.env local                                    backend/.env VM
MySQL local                                           MySQL job_board
```

---

## Mise à jour du site

```bash
cd /var/www/jobboard
sudo bash deploy/update.sh
```

---

## HTTPS (domaine)

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d votre-domaine.fr
```

Puis dans `backend/.env` :

```env
CLIENT_URL=https://votre-domaine.fr
API_PUBLIC_URL=https://votre-domaine.fr
COOKIE_SECURE=true
```

```bash
pm2 restart jobboard-api
```

---

## Consulter la base MySQL

```bash
mysql -u jobboard -p job_board
```

Ou aaPanel → Database → phpMyAdmin → base **job_board**

---

## Dépannage

| Problème | Solution |
|----------|----------|
| Site appelle `localhost:3000` | `bash deploy/scripts/06-deploy-frontend.sh` |
| aaPanel MySQL erreur socket | `ln -sf /var/run/mysqld/mysqld.sock /tmp/mysql.sock` |
| 404 candidat connecté | Compléter **Mon profil** ou `candidate@test.com` |
| API down | `pm2 logs jobboard-api` puis `pm2 restart jobboard-api` |

---

## Fichiers du dossier `deploy/`

```text
deploy/
├── README-DEPLOIEMENT.md          ← ce guide
├── DEPLOIEMENT-VM-ETAPE-PAR-ETAPE.txt
├── deploy.sh                      ← installation complète
├── update.sh                      ← mise à jour
├── env.production.example
├── pm2.ecosystem.config.cjs
├── nginx-aapanel.conf.template
├── nginx-jobboard.conf
└── scripts/
    ├── 01-install-system.sh
    ├── 02-setup-mysql.sh
    ├── …
    └── lib/common.sh
```

---

## Checklist finale

- [ ] `http://IP/` → page Job Board
- [ ] `http://IP/api/health` → `"success":true`
- [ ] Login `candidate@test.com` / `Test1234!`
- [ ] `pm2 list` → `jobboard-api` online
- [ ] Base `job_board` visible dans phpMyAdmin
