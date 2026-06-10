UPDATE `job_alerts`
SET `frequency` = 'weekly'
WHERE `frequency` = 'daily';

ALTER TABLE `job_alerts`
  MODIFY COLUMN `frequency` ENUM('weekly', 'monthly') NOT NULL DEFAULT 'weekly';
