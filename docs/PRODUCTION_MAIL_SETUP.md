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

- `no-reply@tun-job-board.com`
- `contact@tun-job-board.com`
- `support@tun-job-board.com`
- `info@tun-job-board.com`
- `administration@tun-job-board.com`

Do not commit mailbox passwords. Store production secrets only in `/var/www/jobboard/backend/.env` or the server password manager.

## Backend SMTP

Production backend mail settings:

```env
SMTP_HOST=mail.tun-job-board.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=no-reply@tun-job-board.com
SMTP_PASS=CHANGE_ME
SMTP_FROM_NAME=JobBoard TN
SMTP_FROM_EMAIL=no-reply@tun-job-board.com
CONTACT_TO_EMAIL=contact@tun-job-board.com
```

These settings are used for account verification, password reset, job alerts, recruiter team notifications, and the public contact form.

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
