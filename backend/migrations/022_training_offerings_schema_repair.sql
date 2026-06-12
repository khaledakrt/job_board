SET NAMES utf8mb4;

-- Repair existing local databases where training_formations/training_events
-- were created before draft/admin_note support.

SET @table_exists := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'training_formations'
);
SET @sql := IF(
  @table_exists > 0,
  "ALTER TABLE training_formations MODIFY status ENUM('draft', 'pending', 'published', 'rejected') NOT NULL DEFAULT 'pending'",
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'training_formations' AND COLUMN_NAME = 'admin_note'
);
SET @sql := IF(
  @table_exists > 0 AND @col_exists = 0,
  'ALTER TABLE training_formations ADD COLUMN admin_note TEXT NULL AFTER status',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @table_exists := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'training_events'
);
SET @sql := IF(
  @table_exists > 0,
  "ALTER TABLE training_events MODIFY status ENUM('draft', 'pending', 'published', 'rejected') NOT NULL DEFAULT 'pending'",
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'training_events' AND COLUMN_NAME = 'admin_note'
);
SET @sql := IF(
  @table_exists > 0 AND @col_exists = 0,
  'ALTER TABLE training_events ADD COLUMN admin_note TEXT NULL AFTER status',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
