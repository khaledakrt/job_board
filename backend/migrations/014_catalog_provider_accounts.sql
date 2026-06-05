SET NAMES utf8mb4;

ALTER TABLE users
  MODIFY COLUMN role ENUM(
    'candidate',
    'recruiter',
    'admin',
    'training_provider',
    'institution_provider'
  ) NOT NULL DEFAULT 'candidate';

ALTER TABLE training_centers
  ADD COLUMN user_id CHAR(36) NULL AFTER id,
  ADD COLUMN brochures_json JSON NULL AFTER social_links_json,
  ADD INDEX idx_training_centers_user (user_id);

ALTER TABLE private_institutions
  ADD COLUMN user_id CHAR(36) NULL AFTER id,
  ADD COLUMN brochures_json JSON NULL AFTER social_links_json,
  ADD INDEX idx_private_institutions_user (user_id);

ALTER TABLE training_courses
  ADD COLUMN status ENUM('draft', 'published') NOT NULL DEFAULT 'published' AFTER delivery_mode;
