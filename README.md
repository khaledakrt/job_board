# Job Board

Plateforme de recrutement (Angular + Node.js + MySQL).

## Structure

- `frontend/` — application Angular
- `backend/` — API Express
- `deploy/` — déploiement production (Nginx, PM2)

## Démarrage local

1. Copier `backend/.env.example` vers `backend/.env` et adapter les variables.
2. Backend : `cd backend && npm install && npm run db:setup && npm run dev`
3. Frontend : `cd frontend && npm install && npm start`
4. Ouvrir http://localhost:4200

Compte admin (après `npm run db:seed`) : `admin@test.com` / `Test1234!` → http://localhost:4200/admin

## Local → production

1. Tester en local, puis `git commit` + `git push`
2. Sur la VM : `cd /var/www/jobboard && sudo bash deploy/update.sh`

Détails : [deploy/README-DEPLOIEMENT.md#développement-local--production](deploy/README-DEPLOIEMENT.md)

## Déploiement

- **Déploiement VM (scripts + étapes)** : [deploy/README-DEPLOIEMENT.md](deploy/README-DEPLOIEMENT.md)
- Index rapide : [deploy/DEPLOIEMENT-VM-ETAPE-PAR-ETAPE.txt](deploy/DEPLOIEMENT-VM-ETAPE-PAR-ETAPE.txt)
- Script tout-en-un : `sudo -E bash deploy/deploy.sh`
- Mise à jour : `sudo bash deploy/update.sh`
