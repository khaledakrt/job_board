-- Recruiter archives for rejected applications and non-active offers

SET NAMES utf8mb4;

ALTER TABLE `applications`
  ADD COLUMN `archived_at` DATETIME NULL DEFAULT NULL AFTER `interview_at`,
  ADD COLUMN `archived_by` CHAR(36) NULL DEFAULT NULL AFTER `archived_at`,
  ADD COLUMN `deleted_by_recruiter_at` DATETIME NULL DEFAULT NULL AFTER `archived_by`,
  ADD COLUMN `deleted_by_recruiter_by` CHAR(36) NULL DEFAULT NULL AFTER `deleted_by_recruiter_at`,
  ADD KEY `idx_applications_archive` (`archived_at`, `deleted_by_recruiter_at`),
  ADD KEY `idx_applications_archived_by` (`archived_by`),
  ADD KEY `idx_applications_deleted_by_recruiter_by` (`deleted_by_recruiter_by`);

ALTER TABLE `jobs`
  ADD COLUMN `archived_at` DATETIME NULL DEFAULT NULL AFTER `applications_count`,
  ADD COLUMN `archived_by` CHAR(36) NULL DEFAULT NULL AFTER `archived_at`,
  ADD COLUMN `deleted_by_recruiter_at` DATETIME NULL DEFAULT NULL AFTER `archived_by`,
  ADD COLUMN `deleted_by_recruiter_by` CHAR(36) NULL DEFAULT NULL AFTER `deleted_by_recruiter_at`,
  ADD KEY `idx_jobs_archive` (`status`, `archived_at`, `deleted_by_recruiter_at`),
  ADD KEY `idx_jobs_archived_by` (`archived_by`),
  ADD KEY `idx_jobs_deleted_by_recruiter_by` (`deleted_by_recruiter_by`);

UPDATE `applications`
SET `archived_at` = COALESCE(`updated_at`, `created_at`, NOW())
WHERE `status` = 'rejected' AND `archived_at` IS NULL;

UPDATE `jobs`
SET `archived_at` = NOW()
WHERE `status` IN ('hidden', 'expired') AND `archived_at` IS NULL;
