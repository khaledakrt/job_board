SET NAMES utf8mb4;

SET @index_exists := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'user_login_events'
    AND index_name = 'idx_user_login_events_user_created'
);

SET @ddl := IF(
  @index_exists = 0,
  'CREATE INDEX idx_user_login_events_user_created ON user_login_events (user_id, created_at, id)',
  'SELECT 1'
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
