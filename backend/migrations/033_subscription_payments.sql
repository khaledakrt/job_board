CREATE TABLE IF NOT EXISTS `subscription_plans` (
  `id` CHAR(36) NOT NULL,
  `code` VARCHAR(64) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `description` VARCHAR(500) NULL,
  `price_tnd` DECIMAL(10,3) NOT NULL,
  `duration_months` INT UNSIGNED NOT NULL,
  `max_active_jobs` INT UNSIGNED NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_subscription_plans_code` (`code`),
  KEY `idx_subscription_plans_active_order` (`is_active`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `subscription_payment_requests` (
  `id` CHAR(36) NOT NULL,
  `company_id` CHAR(36) NOT NULL,
  `plan_id` CHAR(36) NOT NULL,
  `provider` ENUM('konnect', 'manual') NOT NULL DEFAULT 'konnect',
  `status` ENUM('pending', 'payment_pending', 'paid', 'rejected', 'failed', 'canceled') NOT NULL DEFAULT 'pending',
  `amount_tnd` DECIMAL(10,3) NOT NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'TND',
  `provider_payment_ref` VARCHAR(255) NULL,
  `provider_payment_url` VARCHAR(1024) NULL,
  `payer_email` VARCHAR(255) NULL,
  `payer_phone` VARCHAR(64) NULL,
  `admin_note` VARCHAR(1000) NULL,
  `paid_at` DATETIME NULL,
  `reviewed_at` DATETIME NULL,
  `reviewed_by` CHAR(36) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_subscription_payment_requests_company` (`company_id`, `created_at`),
  KEY `idx_subscription_payment_requests_status` (`status`, `created_at`),
  KEY `idx_subscription_payment_requests_provider_ref` (`provider`, `provider_payment_ref`),
  CONSTRAINT `fk_subscription_payment_requests_company`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_subscription_payment_requests_plan`
    FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_subscription_payment_requests_reviewer`
    FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `subscription_plans`
  (`id`, `code`, `name`, `description`, `price_tnd`, `duration_months`, `max_active_jobs`, `sort_order`)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'monthly_50', 'Abonnement mensuel', 'Publication recruteur pendant 1 mois.', 50.000, 1, NULL, 10),
  ('22222222-2222-4222-8222-222222222222', 'annual_500', 'Abonnement annuel', 'Publication recruteur pendant 12 mois avec 2 mois offerts.', 500.000, 12, NULL, 20);
