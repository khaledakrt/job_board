-- =============================================================================
-- Job Board Platform — Initial MySQL Schema Migration
-- Engine: InnoDB | Charset: utf8mb4 | Collation: utf8mb4_unicode_ci
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` CHAR(36) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('candidate', 'recruiter', 'admin') NOT NULL DEFAULT 'candidate',
  `is_verified` TINYINT(1) NOT NULL DEFAULT 0,
  `verification_token` VARCHAR(255) NULL DEFAULT NULL,
  `reset_token` VARCHAR(255) NULL DEFAULT NULL,
  `reset_expires` DATETIME NULL DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`),
  KEY `idx_users_email` (`email`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_is_verified` (`is_verified`),
  KEY `idx_users_verification_token` (`verification_token`),
  KEY `idx_users_reset_token` (`reset_token`),
  KEY `idx_users_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. companies
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `companies` (
  `id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `logo_url` VARCHAR(512) NULL DEFAULT NULL,
  `website` VARCHAR(512) NULL DEFAULT NULL,
  `description` TEXT NULL DEFAULT NULL,
  `industry` VARCHAR(128) NULL DEFAULT NULL,
  `scale_size` VARCHAR(64) NULL DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_companies_name` (`name`),
  KEY `idx_companies_industry` (`industry`),
  KEY `idx_companies_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. recruiter_profiles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `recruiter_profiles` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `company_id` CHAR(36) NOT NULL,
  `job_title` VARCHAR(255) NULL DEFAULT NULL,
  `phone` VARCHAR(32) NULL DEFAULT NULL,
  `company_role` ENUM('owner', 'recruiter') NOT NULL DEFAULT 'recruiter',
  `can_post_job` TINYINT(1) NOT NULL DEFAULT 0,
  `can_decide_application` TINYINT(1) NOT NULL DEFAULT 0,
  `can_edit_company` TINYINT(1) NOT NULL DEFAULT 0,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_recruiter_profiles_user_id` (`user_id`),
  KEY `idx_recruiter_profiles_company_id` (`company_id`),
  KEY `idx_recruiter_profiles_company_role` (`company_role`),
  KEY `idx_recruiter_profiles_can_post_job` (`can_post_job`),
  CONSTRAINT `fk_recruiter_profiles_user_id`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_recruiter_profiles_company_id`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. candidate_profiles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `candidate_profiles` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `first_name` VARCHAR(128) NULL DEFAULT NULL,
  `last_name` VARCHAR(128) NULL DEFAULT NULL,
  `phone` VARCHAR(32) NULL DEFAULT NULL,
  `avatar_url` VARCHAR(512) NULL DEFAULT NULL,
  `professional_title` VARCHAR(255) NULL DEFAULT NULL,
  `bio` TEXT NULL DEFAULT NULL,
  `skills` JSON NULL DEFAULT NULL,
  `experiences` JSON NULL DEFAULT NULL,
  `education` JSON NULL DEFAULT NULL,
  `resume_url` VARCHAR(512) NULL DEFAULT NULL,
  `min_salary` DECIMAL(12, 2) UNSIGNED NULL DEFAULT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_candidate_profiles_user_id` (`user_id`),
  KEY `idx_candidate_profiles_first_last_name` (`first_name`, `last_name`),
  KEY `idx_candidate_profiles_professional_title` (`professional_title`),
  KEY `idx_candidate_profiles_min_salary` (`min_salary`),
  KEY `idx_candidate_profiles_updated_at` (`updated_at`),
  CONSTRAINT `fk_candidate_profiles_user_id`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. jobs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `jobs` (
  `id` CHAR(36) NOT NULL,
  `company_id` CHAR(36) NOT NULL,
  `recruiter_id` CHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `requirements` TEXT NULL DEFAULT NULL,
  `tags` JSON NULL DEFAULT NULL,
  `location` VARCHAR(255) NULL DEFAULT NULL,
  `remote_type` ENUM('on-site', 'hybrid', 'remote') NOT NULL DEFAULT 'on-site',
  `contract_type` ENUM('CDI', 'CDD', 'Freelance', 'Internship') NOT NULL DEFAULT 'CDI',
  `salary_min` DECIMAL(12, 2) UNSIGNED NULL DEFAULT NULL,
  `salary_max` DECIMAL(12, 2) UNSIGNED NULL DEFAULT NULL,
  `status` ENUM('draft', 'active', 'closed', 'archived') NOT NULL DEFAULT 'draft',
  `views_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `applications_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_jobs_title` (`title`),
  KEY `idx_jobs_location` (`location`),
  KEY `idx_jobs_company_id` (`company_id`),
  KEY `idx_jobs_recruiter_id` (`recruiter_id`),
  KEY `idx_jobs_status` (`status`),
  KEY `idx_jobs_remote_type` (`remote_type`),
  KEY `idx_jobs_contract_type` (`contract_type`),
  KEY `idx_jobs_salary_range` (`salary_min`, `salary_max`),
  KEY `idx_jobs_created_at` (`created_at`),
  KEY `idx_jobs_status_created_at` (`status`, `created_at`),
  KEY `idx_jobs_company_status` (`company_id`, `status`),
  KEY `idx_jobs_location_status` (`location`, `status`),
  CONSTRAINT `fk_jobs_company_id`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_jobs_recruiter_id`
    FOREIGN KEY (`recruiter_id`) REFERENCES `recruiter_profiles` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_jobs_salary_range`
    CHECK (`salary_min` IS NULL OR `salary_max` IS NULL OR `salary_min` <= `salary_max`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. saved_jobs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `saved_jobs` (
  `id` CHAR(36) NOT NULL,
  `candidate_id` CHAR(36) NOT NULL,
  `job_id` CHAR(36) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_saved_jobs_candidate_job` (`candidate_id`, `job_id`),
  KEY `idx_saved_jobs_candidate_id` (`candidate_id`),
  KEY `idx_saved_jobs_job_id` (`job_id`),
  KEY `idx_saved_jobs_created_at` (`created_at`),
  CONSTRAINT `fk_saved_jobs_candidate_id`
    FOREIGN KEY (`candidate_id`) REFERENCES `candidate_profiles` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_saved_jobs_job_id`
    FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. job_alerts
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `job_alerts` (
  `id` CHAR(36) NOT NULL,
  `candidate_id` CHAR(36) NOT NULL,
  `search_filters` JSON NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_job_alerts_candidate_id` (`candidate_id`),
  KEY `idx_job_alerts_created_at` (`created_at`),
  CONSTRAINT `fk_job_alerts_candidate_id`
    FOREIGN KEY (`candidate_id`) REFERENCES `candidate_profiles` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. applications
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `applications` (
  `id` CHAR(36) NOT NULL,
  `job_id` CHAR(36) NOT NULL,
  `candidate_id` CHAR(36) NOT NULL,
  `status` ENUM('applied', 'screening', 'interview', 'offer', 'rejected') NOT NULL DEFAULT 'applied',
  `cover_letter` TEXT NULL DEFAULT NULL,
  `resume_snapshot_url` VARCHAR(512) NULL DEFAULT NULL,
  `rating` TINYINT UNSIGNED NULL DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_applications_job_candidate` (`job_id`, `candidate_id`),
  KEY `idx_applications_job_id` (`job_id`),
  KEY `idx_applications_candidate_id` (`candidate_id`),
  KEY `idx_applications_status` (`status`),
  KEY `idx_applications_rating` (`rating`),
  KEY `idx_applications_created_at` (`created_at`),
  KEY `idx_applications_updated_at` (`updated_at`),
  KEY `idx_applications_job_status` (`job_id`, `status`),
  KEY `idx_applications_candidate_status` (`candidate_id`, `status`),
  CONSTRAINT `fk_applications_job_id`
    FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_applications_candidate_id`
    FOREIGN KEY (`candidate_id`) REFERENCES `candidate_profiles` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_applications_rating`
    CHECK (`rating` IS NULL OR (`rating` >= 1 AND `rating` <= 5))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. application_notes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `application_notes` (
  `id` CHAR(36) NOT NULL,
  `application_id` CHAR(36) NOT NULL,
  `author_id` CHAR(36) NOT NULL,
  `note_text` TEXT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_application_notes_application_id` (`application_id`),
  KEY `idx_application_notes_author_id` (`author_id`),
  KEY `idx_application_notes_created_at` (`created_at`),
  KEY `idx_application_notes_application_created` (`application_id`, `created_at`),
  CONSTRAINT `fk_application_notes_application_id`
    FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_application_notes_author_id`
    FOREIGN KEY (`author_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. candidate_notifications
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `candidate_notifications` (
  `id` CHAR(36) NOT NULL,
  `candidate_id` CHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message_text` TEXT NOT NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_candidate_notifications_candidate_id` (`candidate_id`),
  KEY `idx_candidate_notifications_is_read` (`is_read`),
  KEY `idx_candidate_notifications_created_at` (`created_at`),
  KEY `idx_candidate_notifications_candidate_unread` (`candidate_id`, `is_read`, `created_at`),
  CONSTRAINT `fk_candidate_notifications_candidate_id`
    FOREIGN KEY (`candidate_id`) REFERENCES `candidate_profiles` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 11. subscriptions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id` CHAR(36) NOT NULL,
  `company_id` CHAR(36) NOT NULL,
  `plan_type` VARCHAR(64) NOT NULL,
  `status` ENUM('active', 'canceled') NOT NULL DEFAULT 'active',
  `current_period_end` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_subscriptions_company_id` (`company_id`),
  KEY `idx_subscriptions_status` (`status`),
  KEY `idx_subscriptions_plan_type` (`plan_type`),
  KEY `idx_subscriptions_current_period_end` (`current_period_end`),
  KEY `idx_subscriptions_status_period_end` (`status`, `current_period_end`),
  CONSTRAINT `fk_subscriptions_company_id`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- End of migration 001_initial_schema.sql
-- =============================================================================
