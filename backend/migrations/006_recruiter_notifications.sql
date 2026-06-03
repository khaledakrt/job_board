CREATE TABLE IF NOT EXISTS `recruiter_notifications` (
  `id` CHAR(36) NOT NULL,
  `company_id` CHAR(36) NOT NULL,
  `type` ENUM('application_received') NOT NULL DEFAULT 'application_received',
  `title` VARCHAR(255) NOT NULL,
  `message_text` TEXT NOT NULL,
  `application_id` CHAR(36) NOT NULL,
  `job_id` CHAR(36) NOT NULL,
  `candidate_id` CHAR(36) NOT NULL,
  `candidate_name` VARCHAR(255) NOT NULL,
  `candidate_avatar_url` VARCHAR(512) NULL DEFAULT NULL,
  `job_title` VARCHAR(255) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_recruiter_notifications_company_created` (`company_id`, `created_at`),
  KEY `idx_recruiter_notifications_application` (`application_id`),
  CONSTRAINT `fk_recruiter_notifications_company`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_recruiter_notifications_application`
    FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_recruiter_notifications_job`
    FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_recruiter_notifications_candidate`
    FOREIGN KEY (`candidate_id`) REFERENCES `candidate_profiles` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `recruiter_notification_reads` (
  `notification_id` CHAR(36) NOT NULL,
  `recruiter_id` CHAR(36) NOT NULL,
  `read_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`notification_id`, `recruiter_id`),
  KEY `idx_recruiter_notification_reads_recruiter` (`recruiter_id`),
  CONSTRAINT `fk_recruiter_notification_reads_notification`
    FOREIGN KEY (`notification_id`) REFERENCES `recruiter_notifications` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_recruiter_notification_reads_recruiter`
    FOREIGN KEY (`recruiter_id`) REFERENCES `recruiter_profiles` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
