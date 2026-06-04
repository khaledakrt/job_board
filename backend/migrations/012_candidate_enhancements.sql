-- Candidate enhancements: preferences, alerts, interviews, onboarding

ALTER TABLE `candidate_profiles`
  ADD COLUMN `languages` JSON NULL DEFAULT NULL AFTER `skills`,
  ADD COLUMN `certifications` JSON NULL DEFAULT NULL AFTER `languages`,
  ADD COLUMN `linkedin_url` VARCHAR(512) NULL DEFAULT NULL AFTER `certifications`,
  ADD COLUMN `portfolio_url` VARCHAR(512) NULL DEFAULT NULL AFTER `linkedin_url`,
  ADD COLUMN `job_preferences` JSON NULL DEFAULT NULL AFTER `min_salary`,
  ADD COLUMN `notification_preferences` JSON NULL DEFAULT NULL AFTER `job_preferences`,
  ADD COLUMN `onboarding_completed_at` DATETIME NULL DEFAULT NULL AFTER `notification_preferences`;

ALTER TABLE `job_alerts`
  ADD COLUMN `label` VARCHAR(120) NULL DEFAULT NULL AFTER `search_filters`,
  ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1 AFTER `label`,
  ADD COLUMN `frequency` ENUM('daily', 'weekly') NOT NULL DEFAULT 'weekly' AFTER `is_active`,
  ADD COLUMN `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

ALTER TABLE `applications`
  ADD COLUMN `interview_at` DATETIME NULL DEFAULT NULL AFTER `rating`,
  ADD KEY `idx_applications_interview_at` (`interview_at`);
