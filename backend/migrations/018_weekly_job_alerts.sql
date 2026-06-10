ALTER TABLE `job_alerts`
  ADD COLUMN `last_sent_at` DATETIME NULL DEFAULT NULL AFTER `frequency`;

UPDATE `job_alerts`
SET `frequency` = 'weekly'
WHERE `frequency` = 'daily';
