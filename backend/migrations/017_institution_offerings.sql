CREATE TABLE IF NOT EXISTS `institution_offerings` (
  `id` CHAR(36) NOT NULL,
  `institution_id` CHAR(36) NOT NULL,
  `offering_type` ENUM('program', 'event', 'announcement', 'opportunity') NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `summary` VARCHAR(500) NULL DEFAULT NULL,
  `description` TEXT NULL DEFAULT NULL,
  `category` VARCHAR(128) NULL DEFAULT NULL,
  `event_type` ENUM('open_day', 'conference', 'seminar', 'workshop', 'webinar', 'admission_contest', 'other') NULL DEFAULT NULL,
  `opportunity_type` ENUM('job', 'internship') NULL DEFAULT NULL,
  `start_date` DATE NULL DEFAULT NULL,
  `end_date` DATE NULL DEFAULT NULL,
  `start_time` TIME NULL DEFAULT NULL,
  `end_time` TIME NULL DEFAULT NULL,
  `city` VARCHAR(128) NULL DEFAULT NULL,
  `address` VARCHAR(512) NULL DEFAULT NULL,
  `price` DECIMAL(10,2) NULL DEFAULT NULL,
  `seats` INT UNSIGNED NULL DEFAULT NULL,
  `main_image_url` VARCHAR(512) NULL DEFAULT NULL,
  `gallery_json` JSON NULL DEFAULT NULL,
  `phone` VARCHAR(64) NULL DEFAULT NULL,
  `email` VARCHAR(255) NULL DEFAULT NULL,
  `website` VARCHAR(512) NULL DEFAULT NULL,
  `status` ENUM('draft', 'pending', 'published', 'rejected') NOT NULL DEFAULT 'draft',
  `admin_note` TEXT NULL DEFAULT NULL,
  `views_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `clicks_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_institution_offerings_institution_type_status` (`institution_id`, `offering_type`, `status`),
  KEY `idx_institution_offerings_status_created` (`status`, `created_at`),
  CONSTRAINT `fk_institution_offerings_institution`
    FOREIGN KEY (`institution_id`) REFERENCES `private_institutions` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `institution_participations` (
  `id` CHAR(36) NOT NULL,
  `offering_id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `participation_type` ENUM('interested', 'registered') NOT NULL DEFAULT 'registered',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_institution_participation` (`offering_id`, `user_id`),
  KEY `idx_institution_participations_user` (`user_id`),
  CONSTRAINT `fk_institution_participations_offering`
    FOREIGN KEY (`offering_id`) REFERENCES `institution_offerings` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_institution_participations_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
