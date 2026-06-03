-- Extended company profile for recruiter onboarding (legal, address, contact)

ALTER TABLE `companies`
  ADD COLUMN `legal_name` VARCHAR(255) NULL DEFAULT NULL AFTER `name`,
  ADD COLUMN `legal_form` VARCHAR(64) NULL DEFAULT NULL AFTER `legal_name`,
  ADD COLUMN `siret` VARCHAR(14) NULL DEFAULT NULL AFTER `legal_form`,
  ADD COLUMN `vat_number` VARCHAR(32) NULL DEFAULT NULL AFTER `siret`,
  ADD COLUMN `street_address` VARCHAR(255) NULL DEFAULT NULL AFTER `vat_number`,
  ADD COLUMN `postal_code` VARCHAR(20) NULL DEFAULT NULL AFTER `street_address`,
  ADD COLUMN `city` VARCHAR(128) NULL DEFAULT NULL AFTER `postal_code`,
  ADD COLUMN `country` VARCHAR(64) NULL DEFAULT 'France' AFTER `city`,
  ADD COLUMN `contact_email` VARCHAR(255) NULL DEFAULT NULL AFTER `country`,
  ADD COLUMN `contact_phone` VARCHAR(32) NULL DEFAULT NULL AFTER `contact_email`,
  ADD COLUMN `linkedin_url` VARCHAR(512) NULL DEFAULT NULL AFTER `contact_phone`,
  ADD COLUMN `founded_year` SMALLINT UNSIGNED NULL DEFAULT NULL AFTER `linkedin_url`;

CREATE INDEX `idx_companies_siret` ON `companies` (`siret`);
CREATE INDEX `idx_companies_city` ON `companies` (`city`);
