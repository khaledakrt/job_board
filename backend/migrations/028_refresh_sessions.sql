SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `refresh_sessions` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `token_hash` CHAR(64) NOT NULL,
  `user_agent` VARCHAR(500) NULL DEFAULT NULL,
  `ip_address` VARCHAR(45) NULL DEFAULT NULL,
  `expires_at` DATETIME NOT NULL,
  `revoked_at` DATETIME NULL DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_refresh_sessions_token_hash` (`token_hash`),
  KEY `idx_refresh_sessions_user_id` (`user_id`),
  KEY `idx_refresh_sessions_validity` (`user_id`, `revoked_at`, `expires_at`),
  CONSTRAINT `fk_refresh_sessions_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
