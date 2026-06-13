SET NAMES utf8mb4;

SET @idx_exists := (
  SELECT COUNT(1)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'applications'
    AND INDEX_NAME = 'idx_applications_candidate_status_updated'
);
SET @sql := IF(
  @idx_exists = 0,
  'CREATE INDEX idx_applications_candidate_status_updated ON applications (candidate_id, status, updated_at)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(1)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'applications'
    AND INDEX_NAME = 'idx_applications_job_updated'
);
SET @sql := IF(
  @idx_exists = 0,
  'CREATE INDEX idx_applications_job_updated ON applications (job_id, updated_at)',
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
    AND INDEX_NAME = 'idx_jobs_company_status_created'
);
SET @sql := IF(
  @idx_exists = 0,
  'CREATE INDEX idx_jobs_company_status_created ON jobs (company_id, status, created_at)',
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
    AND INDEX_NAME = 'idx_jobs_public_search'
);
SET @sql := IF(
  @idx_exists = 0,
  'CREATE INDEX idx_jobs_public_search ON jobs (status, created_at, applications_count)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(1)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'formation_participations'
    AND INDEX_NAME = 'idx_formation_participations_lookup'
);
SET @sql := IF(
  @idx_exists = 0,
  'CREATE INDEX idx_formation_participations_lookup ON formation_participations (formation_id, participation_type, created_at)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(1)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'event_participations'
    AND INDEX_NAME = 'idx_event_participations_lookup'
);
SET @sql := IF(
  @idx_exists = 0,
  'CREATE INDEX idx_event_participations_lookup ON event_participations (event_id, participation_type, created_at)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(1)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'job_alerts'
    AND INDEX_NAME = 'idx_job_alerts_due'
);
SET @sql := IF(
  @idx_exists = 0,
  'CREATE INDEX idx_job_alerts_due ON job_alerts (is_active, frequency, last_sent_at)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
