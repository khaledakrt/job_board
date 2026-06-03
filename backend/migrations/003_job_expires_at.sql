-- Automatic job expiration date (set at creation, not manual status toggle)
ALTER TABLE `jobs`
  ADD COLUMN `expires_at` DATETIME NULL DEFAULT NULL AFTER `status`;

UPDATE `jobs`
SET `expires_at` = DATE_ADD(`created_at`, INTERVAL 60 DAY)
WHERE `expires_at` IS NULL;

ALTER TABLE `jobs`
  MODIFY COLUMN `expires_at` DATETIME NOT NULL;

ALTER TABLE `jobs`
  ADD KEY `idx_jobs_expires_at` (`expires_at`);
