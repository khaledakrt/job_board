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

## Déploiement

Voir [deploy/DEPLOY.md](deploy/DEPLOY.md).
