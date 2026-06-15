# Production Mail Setup

This document records the production mail setup for JobBoard TN without storing secrets.

## Domain And DNS

- Domain: `tun-job-board.com`
- Mail host: `mail.tun-job-board.com`
- VPS IPv4: `5.189.190.131`
- Reverse DNS/PTR: `5.189.190.131` points to `mail.tun-job-board.com`

Cloudflare DNS records:

- `A mail -> 5.189.190.131` with DNS only
- `MX @ -> mail.tun-job-board.com` with priority `10`
- `TXT @ -> v=spf1 mx a ip4:5.189.190.131 ~all`
- `TXT _dmarc -> v=DMARC1; p=quarantine; rua=mailto:administration@tun-job-board.com`
- `TXT default._domainkey -> v=DKIM1; k=rsa; p=...` from aaPanel Mail Server

## Mailboxes

The production mail server hosts these mailboxes:

- `support@tun-job-board.com` — display name: `Support Tun Job` — technical support and user assistance
- `no-reply@tun-job-board.com` — display name: `Tun Job` — automatic system emails such as verification and password reset
- `administration@tun-job-board.com` — display name: `Administration Tun Job` — administrative and management requests
- `info@tun-job-board.com` — display name: `Informations Tun Job` — general information requests
- `contact@tun-job-board.com` — display name: `Relations Professionnelles Tun Job` — professional contact and partnerships

Do not commit mailbox passwords. Store production secrets only in `/var/www/jobboard/backend/.env` or the server password manager.

## Backend SMTP

Production backend mail settings:

```env
SMTP_HOST=mail.tun-job-board.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=support@tun-job-board.com
SMTP_PASS=CHANGE_ME
SMTP_FROM_NAME=Support Tun Job
SMTP_FROM_EMAIL=support@tun-job-board.com
SYSTEM_EMAIL_FROM_NAME=Tun Job
SYSTEM_EMAIL_FROM_EMAIL=no-reply@tun-job-board.com
CONTACT_TO_EMAIL=contact@tun-job-board.com
```

`SMTP_FROM_*` is the default support identity. `SYSTEM_EMAIL_FROM_*` is used for account verification and password reset emails. The SMTP server must allow the authenticated mailbox to send as `no-reply@tun-job-board.com`, or `SMTP_USER` should be changed to `no-reply@tun-job-board.com` with its own mailbox password.

## Web Access

Nginx Ubuntu is the active web server. aaPanel Nginx is not used for public web routing.

Configured public endpoints:

- Webmail: `https://mail.tun-job-board.com`
- phpMyAdmin: `https://tun-job-board.com/db-admin/` protected by Nginx Basic Auth

## Server Services

Mail services:

- Postfix for SMTP
- Dovecot for IMAP/POP and SASL auth
- Rspamd for mail filtering

Postfix and Dovecot should present a valid certificate for `mail.tun-job-board.com`.
