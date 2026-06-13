SET NAMES utf8mb4;

SET @col_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'jobs'
    AND COLUMN_NAME = 'salary_min'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE jobs ADD COLUMN salary_min DECIMAL(12,2) NULL DEFAULT NULL AFTER salary_label',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'jobs'
    AND COLUMN_NAME = 'salary_max'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE jobs ADD COLUMN salary_max DECIMAL(12,2) NULL DEFAULT NULL AFTER salary_min',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'jobs'
    AND COLUMN_NAME = 'salary_currency'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE jobs ADD COLUMN salary_currency VARCHAR(8) NULL DEFAULT NULL AFTER salary_max',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'jobs'
    AND COLUMN_NAME = 'salary_period'
);
SET @sql := IF(
  @col_exists = 0,
  "ALTER TABLE jobs ADD COLUMN salary_period ENUM('month', 'year', 'day', 'hour') NULL DEFAULT NULL AFTER salary_currency",
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(1)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'jobs'
    AND INDEX_NAME = 'idx_jobs_salary'
);
SET @sql := IF(
  @idx_exists = 0,
  'CREATE INDEX idx_jobs_salary ON jobs (status, salary_max, salary_min)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `jobs`
SET
  `salary_min` = CAST(REPLACE(REGEXP_SUBSTR(`salary_label`, '[0-9]+([.,][0-9]+)?'), ',', '.') AS DECIMAL(12,2)),
  `salary_currency` = CASE
    WHEN UPPER(`salary_label`) LIKE '%EUR%' OR `salary_label` LIKE '%€%' THEN 'EUR'
    WHEN UPPER(`salary_label`) LIKE '%USD%' OR `salary_label` LIKE '%$%' THEN 'USD'
    ELSE 'TND'
  END,
  `salary_period` = CASE
    WHEN LOWER(`salary_label`) LIKE '%an%' OR LOWER(`salary_label`) LIKE '%year%' THEN 'year'
    WHEN LOWER(`salary_label`) LIKE '%jour%' OR LOWER(`salary_label`) LIKE '%day%' THEN 'day'
    WHEN LOWER(`salary_label`) LIKE '%heure%' OR LOWER(`salary_label`) LIKE '%hour%' THEN 'hour'
    ELSE 'month'
  END
WHERE `salary_label` IS NOT NULL
  AND `salary_label` REGEXP '[0-9]'
  AND `salary_min` IS NULL;
