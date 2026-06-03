# Déploiement public (VM PVS)

Ce guide permet d’exposer le Job Board sur Internet (domaine ou IP publique).

## Instance en production (IP)

- **Site** : http://5.189.190.131
- **API** : http://5.189.190.131/api/health
- **Code** : `/var/www/jobboard` (clone GitHub)
- **Fichiers statiques** : `/var/www/jobboard/site`
- **Nginx (aaPanel)** : `/www/server/panel/vhost/nginx/5.189.190.131.conf`
- **Process API** : `pm2 list` → `jobboard-api`

Comptes de test (après `npm run db:seed`) :

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Candidat | candidate@test.com | Test1234! |
| Recruteur | recruiter@test.com | Test1234! |

## Ce dont vous avez besoin

| Élément | Détail |
|--------|--------|
| VM | Linux Ubuntu 22.04/24.04 recommandé (2 Go RAM min, 4 Go si Ollama) |
| Accès | SSH (`root` ou utilisateur sudo) |
| Ports | **80** et **443** ouverts (pare-feu PVS + box/routeur si besoin) |
| DNS | Enregistrement **A** `votre-domaine.fr` → IP publique de la VM |
| MySQL | Sur la VM ou base managée |
| Secrets | Nouveaux mots de passe JWT/DB — ne pas réutiliser le `.env` de dev tel quel |

## Architecture en production

```
Internet → Nginx (:80/:443)
            ├── /          → Angular (fichiers statiques)
            ├── /api/      → Node.js :3000 (PM2)
            └── /uploads/ → Node.js (fichiers CV)
```

Le frontend production appelle déjà l’API via `/api` (`environment.prod.ts`).

## Étapes rapides (Linux)

### 1. Copier le projet sur la VM

```bash
sudo mkdir -p /var/www/jobboard
sudo chown $USER:$USER /var/www/jobboard
cd /var/www/jobboard
git clone <URL_DU_REPO> .   # ou scp/rsync depuis votre PC
```

### 2. Configurer l’environnement

```bash
cp deploy/env.production.example backend/.env
nano backend/.env
```

Variables **obligatoires** à adapter :

- `CLIENT_URL` et `API_PUBLIC_URL` : `https://votre-domaine.fr`
- `DB_*` : utilisateur MySQL dédié (pas `root` en prod)
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` : `openssl rand -hex 32`
- `COOKIE_SECURE=true`
- `CV_LLM_PROVIDER=off` sauf si Ollama est installé sur la VM

### 3. MySQL

```bash
sudo mysql
```

```sql
CREATE DATABASE job_board CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'jobboard'@'localhost' IDENTIFIED BY 'mot_de_passe_fort';
GRANT ALL PRIVILEGES ON job_board.* TO 'jobboard'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4. Installation automatique

```bash
sudo DOMAIN=votre-domaine.fr bash deploy/install-linux.sh
```

### 5. HTTPS (Let’s Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d votre-domaine.fr -d www.votre-domaine.fr
```

### 6. Données de démo (optionnel)

```bash
cd /var/www/jobboard/backend
npm run db:seed
npm run db:seed:demo
```

## Pare-feu PVS / hébergeur

Dans le panneau PVS, autoriser le trafic entrant **TCP 80** et **443** vers la VM.  
Si vous n’avez pas de domaine, vous pouvez tester avec `http://IP_PUBLIQUE` en mettant `server_name _;` dans `deploy/nginx-jobboard.conf`.

## Ollama sur le serveur (optionnel)

Analyse CV par IA locale : installer [Ollama](https://ollama.com) sur la VM, puis `CV_LLM_PROVIDER=ollama`.  
Prévoir **8 Go+ RAM** ; sinon laisser `CV_LLM_PROVIDER=off`.

## Mise à jour après modification du code

```bash
cd /var/www/jobboard
git pull
cd backend && npm ci --omit=dev
cd ../frontend && npm ci && npm run build -- --configuration=production
sudo cp -r frontend/dist/job-board-frontend/browser/* /var/www/jobboard/frontend/
pm2 restart jobboard-api
```

## Sécurité

- Ne jamais committer `backend/.env`
- Régénérer JWT et mot de passe DB pour la production
- Révoquer les mots de passe exposés en développement
- Sauvegardes régulières MySQL + dossier `backend/uploads`

## Aide depuis Cursor

Je ne peux pas me connecter seul à votre VM. Pour une mise en place **assistée**, fournissez :

1. OS de la VM (Ubuntu / Windows Server)
2. IP publique ou domaine
3. Accès SSH (ou exécutez les commandes que je vous envoie)

Je peux alors adapter la config (Nginx, `.env`, pare-feu) étape par étape.
