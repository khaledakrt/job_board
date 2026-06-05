SET NAMES utf8mb4;

-- Réparation idempotente si 013/014 ont été partiellement appliquées

CREATE TABLE IF NOT EXISTS training_centers (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  logo_url VARCHAR(512) NULL,
  description TEXT NULL,
  short_description VARCHAR(500) NULL,
  city VARCHAR(128) NULL,
  address VARCHAR(512) NULL,
  phone VARCHAR(64) NULL,
  email VARCHAR(255) NULL,
  website VARCHAR(512) NULL,
  training_domain VARCHAR(128) NULL,
  delivery_mode ENUM('online', 'onsite', 'hybrid') NULL,
  photos_json JSON NULL,
  social_links_json JSON NULL,
  status ENUM('pending', 'published', 'rejected') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_training_centers_status (status),
  INDEX idx_training_centers_city (city),
  INDEX idx_training_centers_domain (training_domain),
  INDEX idx_training_centers_delivery (delivery_mode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS private_institutions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  institution_type ENUM(
    'primary',
    'college',
    'high_school',
    'higher_institute',
    'university',
    'academy'
  ) NOT NULL,
  logo_url VARCHAR(512) NULL,
  description TEXT NULL,
  short_description VARCHAR(500) NULL,
  city VARCHAR(128) NULL,
  address VARCHAR(512) NULL,
  phone VARCHAR(64) NULL,
  email VARCHAR(255) NULL,
  website VARCHAR(512) NULL,
  map_url VARCHAR(512) NULL,
  photos_json JSON NULL,
  social_links_json JSON NULL,
  programs_json JSON NULL,
  status ENUM('pending', 'published', 'rejected') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_private_institutions_status (status),
  INDEX idx_private_institutions_city (city),
  INDEX idx_private_institutions_type (institution_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'
    AND COLUMN_TYPE LIKE '%training_provider%'
);
SET @sql := IF(
  @col_exists = 0,
  "ALTER TABLE users MODIFY COLUMN role ENUM('candidate','recruiter','admin','training_provider','institution_provider') NOT NULL DEFAULT 'candidate'",
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'training_centers' AND COLUMN_NAME = 'user_id'
);
SET @sql := IF(@col_exists = 0, 'ALTER TABLE training_centers ADD COLUMN user_id CHAR(36) NULL AFTER id', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'training_centers' AND COLUMN_NAME = 'brochures_json'
);
SET @sql := IF(@col_exists = 0, 'ALTER TABLE training_centers ADD COLUMN brochures_json JSON NULL AFTER social_links_json', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'private_institutions' AND COLUMN_NAME = 'user_id'
);
SET @sql := IF(@col_exists = 0, 'ALTER TABLE private_institutions ADD COLUMN user_id CHAR(36) NULL AFTER id', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'private_institutions' AND COLUMN_NAME = 'brochures_json'
);
SET @sql := IF(@col_exists = 0, 'ALTER TABLE private_institutions ADD COLUMN brochures_json JSON NULL AFTER social_links_json', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'training_centers' AND INDEX_NAME = 'idx_training_centers_user'
);
SET @sql := IF(@idx_exists = 0, 'ALTER TABLE training_centers ADD INDEX idx_training_centers_user (user_id)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'private_institutions' AND INDEX_NAME = 'idx_private_institutions_user'
);
SET @sql := IF(@idx_exists = 0, 'ALTER TABLE private_institutions ADD INDEX idx_private_institutions_user (user_id)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS training_courses (
  id CHAR(36) NOT NULL PRIMARY KEY,
  center_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  delivery_mode ENUM('online', 'onsite', 'hybrid') NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_training_courses_center (center_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'training_courses' AND COLUMN_NAME = 'status'
);
SET @sql := IF(
  @col_exists = 0,
  "ALTER TABLE training_courses ADD COLUMN status ENUM('draft', 'published') NOT NULL DEFAULT 'published' AFTER delivery_mode",
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
