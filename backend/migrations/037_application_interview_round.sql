ALTER TABLE `applications`
  ADD COLUMN `interview_round` TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER `interview_at`;
