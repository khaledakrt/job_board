# Scripts de mise à jour — JobBoard

## Script principal (inchangé)

Pour presque toutes les mises à jour après `git push` :

```bash
cd /var/www/jobboard
sudo bash deploy/update.sh
```

Fait : `git pull` → backend (`npm ci`, migrations) → build Angular → `site/` → `pm2 restart` → health check.

**Ne pas modifier `update.sh`** sauf changement du flux standard.

---

## Scripts complémentaires

Utilisés **en plus** de `update.sh` quand une étape n’est pas couverte, ou **seuls** pour un cas précis.

| Script | Quand l’utiliser | Après `update.sh` ? |
|--------|------------------|---------------------|
| `update.sh` | Mise à jour normale (défaut) | — |
| `update_exemple.sh` | Modèle pour créer vos propres scripts | `SKIP_GIT_PULL=1` |
| `update-env-restart.sh` | `.env` modifié sur la VM (SMTP, URLs…) | Non requis |
| `update-frontend-only.sh` | Uniquement Angular (build rapide) | Optionnel (`SKIP_GIT_PULL=1`) |
| `update-backend-only.sh` | Uniquement API + migrations | Optionnel |
| `update-nginx.sh` | Config Nginx / aaPanel modifiée dans git | `SKIP_GIT_PULL=1` |

Bibliothèque partagée : `deploy/lib/update-common.sh` (fonctions `jb_*`).

---

## Flux recommandé

### Cas standard (99 % du temps)

```bash
# PC
git push

# VM
cd /var/www/jobboard
sudo bash deploy/update.sh
```

### Standard + étape extra

```bash
sudo bash deploy/update.sh
SKIP_GIT_PULL=1 sudo bash deploy/update-nginx.sh   # exemple Nginx
```

`SKIP_GIT_PULL=1` évite un second `git pull` inutile.

### Sans repasser par update.sh

| Besoin | Commande |
|--------|----------|
| `.env` seulement | `nano backend/.env` puis `sudo bash deploy/update-env-restart.sh` |
| Frontend seul | `sudo bash deploy/update-frontend-only.sh` |
| Backend seul | `sudo bash deploy/update-backend-only.sh` |

---

## Créer un nouveau script

1. Copier le modèle :

   ```bash
   cp deploy/update_exemple.sh deploy/update-ma-tache.sh
   chmod +x deploy/update-ma-tache.sh
   ```

2. Décommenter / ajouter les appels `jb_*` ou commandes custom.

3. Documenter le script dans ce fichier (tableau ci-dessus).

4. Commit + push, puis sur la VM :

   ```bash
   sudo bash deploy/update.sh
   SKIP_GIT_PULL=1 sudo bash deploy/update-ma-tache.sh
   ```

---

## Variables utiles

| Variable | Défaut | Rôle |
|----------|--------|------|
| `APP_ROOT` | `/var/www/jobboard` | Racine du projet |
| `SITE_ROOT` | `/var/www/jobboard/site` | Fichiers statiques Angular |
| `SKIP_GIT_PULL` | `0` | `1` = ne pas refaire `git pull` |
| `SERVER_NAME` | — | Requis pour `update-nginx.sh` (IP ou domaine) |

Exemple :

```bash
export SERVER_NAME=5.189.190.131
SKIP_GIT_PULL=1 sudo -E bash deploy/update-nginx.sh
```
