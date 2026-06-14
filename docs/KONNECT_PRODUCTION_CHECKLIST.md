# Checklist Konnect production

Objectif: eviter d'activer le mode `paid_required` tant que le paiement en ligne recruteur n'est pas pret.

## 1. Garder le mode gratuit pendant la configuration

Dans l'administration, laisser la regle globale recruteur sur `free_all` tant que les cles Konnect ne sont pas configurees et testees.

Effet attendu:
- Les recruteurs peuvent continuer a publier.
- Aucun recruteur n'est bloque par un paiement non configure.

## 2. Configurer les variables serveur

Dans `/var/www/jobboard/backend/.env`, renseigner les vraies valeurs marchand:

```env
KONNECT_API_BASE_URL=https://api.konnect.network/api/v2
KONNECT_API_KEY=...
KONNECT_WALLET_ID=...
KONNECT_ACCEPTED_METHODS=wallet,bank_card,e-DINAR,flouci
KONNECT_PAYMENT_LIFESPAN_MINUTES=30
```

Ne jamais committer ces valeurs dans Git.

## 3. Redemarrer et verifier l'API

```bash
sudo systemctl restart pm2-jobboard
sudo runuser -u jobboard -- pm2 status
curl -I https://tun-job-board.com/api/health
```

L'API doit rester `online` et retourner `HTTP/2 200`.

## 4. Faire un paiement test avant activation globale

Avant de passer en `paid_required`:
- verifier avec Konnect que le compte marchand est actif;
- verifier les moyens de paiement autorises;
- faire une demande de paiement recruteur test;
- confirmer que l'URL de paiement Konnect s'ouvre;
- verifier le retour/webhook ou la validation admin;
- confirmer que l'abonnement devient actif.

## 5. Activer `paid_required` seulement apres validation

Quand le test est reussi, l'admin peut passer la regle globale en `paid_required`.

Apres activation:
- verifier qu'un recruteur sans abonnement est bloque a la publication;
- verifier qu'un recruteur avec abonnement actif peut publier;
- verifier que le mode `free_all` permet toujours de revenir a un acces gratuit global en cas d'incident.
