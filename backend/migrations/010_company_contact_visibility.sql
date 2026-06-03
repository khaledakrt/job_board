-- Visibilité publique e-mail / téléphone sur la page entreprise
ALTER TABLE `companies`
  ADD COLUMN `contact_email_public` TINYINT(1) NOT NULL DEFAULT 0 AFTER `contact_phone`,
  ADD COLUMN `contact_phone_public` TINYINT(1) NOT NULL DEFAULT 0 AFTER `contact_email_public`;
