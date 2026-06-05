-- Formations et événements des centres (modération admin avant publication)

CREATE TABLE IF NOT EXISTS training_formations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  center_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(120) NULL,
  short_description VARCHAR(500) NULL,
  description TEXT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  duration_label VARCHAR(120) NULL,
  city VARCHAR(120) NULL,
  address VARCHAR(255) NULL,
  delivery_mode ENUM('online', 'onsite', 'hybrid') NULL,
  price DECIMAL(12, 2) NULL,
  certificate_delivered TINYINT(1) NOT NULL DEFAULT 0,
  seats INT UNSIGNED NULL,
  main_image_url VARCHAR(512) NULL,
  gallery_json JSON NULL,
  phone VARCHAR(50) NULL,
  email VARCHAR(255) NULL,
  website VARCHAR(512) NULL,
  status ENUM('pending', 'published', 'rejected') NOT NULL DEFAULT 'pending',
  admin_note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_training_formations_center (center_id),
  INDEX idx_training_formations_status (status),
  CONSTRAINT fk_training_formations_center
    FOREIGN KEY (center_id) REFERENCES training_centers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS training_events (
  id CHAR(36) NOT NULL PRIMARY KEY,
  center_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  event_type VARCHAR(80) NOT NULL,
  description TEXT NULL,
  event_date DATE NULL,
  start_time TIME NULL,
  end_time TIME NULL,
  city VARCHAR(120) NULL,
  address VARCHAR(255) NULL,
  price DECIMAL(12, 2) NULL,
  seats INT UNSIGNED NULL,
  poster_image_url VARCHAR(512) NULL,
  gallery_json JSON NULL,
  phone VARCHAR(50) NULL,
  email VARCHAR(255) NULL,
  website VARCHAR(512) NULL,
  status ENUM('pending', 'published', 'rejected') NOT NULL DEFAULT 'pending',
  admin_note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_training_events_center (center_id),
  INDEX idx_training_events_status (status),
  CONSTRAINT fk_training_events_center
    FOREIGN KEY (center_id) REFERENCES training_centers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS formation_participations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  formation_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  participation_type ENUM('interested', 'registered') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_formation_participation (formation_id, user_id),
  INDEX idx_formation_participations_user (user_id),
  CONSTRAINT fk_formation_participations_formation
    FOREIGN KEY (formation_id) REFERENCES training_formations(id) ON DELETE CASCADE,
  CONSTRAINT fk_formation_participations_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS event_participations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  event_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  participation_type ENUM('interested', 'registered') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_event_participation (event_id, user_id),
  INDEX idx_event_participations_user (user_id),
  CONSTRAINT fk_event_participations_event
    FOREIGN KEY (event_id) REFERENCES training_events(id) ON DELETE CASCADE,
  CONSTRAINT fk_event_participations_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
