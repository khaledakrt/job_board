-- Admin moderation: user ban fields + login IP history

SET NAMES utf8mb4;

ALTER TABLE `users`
  ADD COLUMN `is_banned` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_verified`,
  ADD COLUMN `ban_reason` VARCHAR(500) NULL DEFAULT NULL AFTER `is_banned`,
  ADD COLUMN `banned_at` DATETIME NULL DEFAULT NULL AFTER `ban_reason`,
  ADD COLUMN `last_login_ip` VARCHAR(45) NULL DEFAULT NULL AFTER `banned_at`,
  ADD KEY `idx_users_is_banned` (`is_banned`);

CREATE TABLE IF NOT EXISTS `user_login_events` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `ip_address` VARCHAR(45) NOT NULL,
  `user_agent` VARCHAR(512) NULL DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_login_events_user_id` (`user_id`),
  KEY `idx_login_events_ip` (`ip_address`),
  KEY `idx_login_events_created_at` (`created_at`),
  CONSTRAINT `fk_login_events_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
