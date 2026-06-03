-- Job visibility statuses: draft | active (public) | hidden | expired
UPDATE `jobs` SET `status` = 'expired' WHERE `status` IN ('closed', 'archived');

ALTER TABLE `jobs`
  MODIFY COLUMN `status` ENUM('draft', 'active', 'hidden', 'expired') NOT NULL DEFAULT 'draft';
