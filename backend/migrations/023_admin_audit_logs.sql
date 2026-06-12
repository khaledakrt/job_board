-- Admin audit trail for sensitive back-office actions

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `admin_audit_logs` (
  `id` CHAR(36) NOT NULL,
  `actor_id` CHAR(36) NULL DEFAULT NULL,
  `action` VARCHAR(100) NOT NULL,
  `target_type` VARCHAR(80) NOT NULL,
  `target_id` CHAR(36) NULL DEFAULT NULL,
  `metadata` JSON NULL DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_admin_audit_actor_id` (`actor_id`),
  KEY `idx_admin_audit_target` (`target_type`, `target_id`),
  KEY `idx_admin_audit_action` (`action`),
  KEY `idx_admin_audit_created_at` (`created_at`),
  CONSTRAINT `fk_admin_audit_actor` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
