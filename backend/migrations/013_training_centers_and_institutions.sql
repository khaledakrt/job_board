SET NAMES utf8mb4;

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

CREATE TABLE IF NOT EXISTS training_courses (
  id CHAR(36) NOT NULL PRIMARY KEY,
  center_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  delivery_mode ENUM('online', 'onsite', 'hybrid') NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_training_courses_center (center_id),
  CONSTRAINT fk_training_courses_center
    FOREIGN KEY (center_id) REFERENCES training_centers(id) ON DELETE CASCADE
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
