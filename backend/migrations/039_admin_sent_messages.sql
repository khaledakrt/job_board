-- Historique des e-mails envoyés depuis Admin > Messages

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `admin_sent_messages` (
  `id` CHAR(36) NOT NULL,
  `actor_id` CHAR(36) NULL DEFAULT NULL,
  `sender_name` VARCHAR(120) NOT NULL,
  `sender_email` VARCHAR(255) NOT NULL,
  `subject` VARCHAR(180) NOT NULL,
  `body` TEXT NULL DEFAULT NULL,
  `recipients` JSON NULL DEFAULT NULL,
  `sent_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `failed_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_admin_sent_messages_created_at` (`created_at`),
  CONSTRAINT `fk_admin_sent_messages_actor` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `admin_sent_messages` (
  `id`,
  `actor_id`,
  `sender_name`,
  `sender_email`,
  `subject`,
  `body`,
  `recipients`,
  `sent_count`,
  `failed_count`,
  `created_at`
)
SELECT
  `id`,
  `actor_id`,
  COALESCE(JSON_UNQUOTE(JSON_EXTRACT(`metadata`, '$.sender')), ''),
  COALESCE(JSON_UNQUOTE(JSON_EXTRACT(`metadata`, '$.sender')), ''),
  LEFT(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(`metadata`, '$.subject')), '(sans objet)'), 180),
  NULL,
  NULL,
  CAST(COALESCE(JSON_EXTRACT(`metadata`, '$.sent'), 0) AS UNSIGNED),
  CAST(COALESCE(JSON_EXTRACT(`metadata`, '$.failed'), 0) AS UNSIGNED),
  `created_at`
FROM `admin_audit_logs`
WHERE `action` = 'announcement.send';
