SET NAMES utf8mb4;

SET @col_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'verification_expires'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE users ADD COLUMN verification_expires DATETIME NULL DEFAULT NULL AFTER verification_token',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(1)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND INDEX_NAME = 'idx_users_verification_expires'
);
SET @sql := IF(
  @idx_exists = 0,
  'CREATE INDEX idx_users_verification_expires ON users (verification_expires)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `users`
SET `verification_token` = SHA2(`verification_token`, 256)
WHERE `verification_token` IS NOT NULL
  AND CHAR_LENGTH(`verification_token`) <> 64;

UPDATE `users`
SET `reset_token` = SHA2(`reset_token`, 256)
WHERE `reset_token` IS NOT NULL
  AND CHAR_LENGTH(`reset_token`) <> 64;

UPDATE `users`
SET `verification_expires` = DATE_ADD(NOW(), INTERVAL 48 HOUR)
WHERE `verification_token` IS NOT NULL
  AND `verification_expires` IS NULL;
