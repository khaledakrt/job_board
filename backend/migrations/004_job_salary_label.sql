-- Replace salary_min / salary_max with free-text salary_label
ALTER TABLE `jobs`
  ADD COLUMN `salary_label` VARCHAR(255) NULL DEFAULT NULL AFTER `contract_type`;

UPDATE `jobs`
SET `salary_label` = CONCAT(
  CAST(`salary_min` AS UNSIGNED),
  ' – ',
  CAST(`salary_max` AS UNSIGNED),
  ' € / an'
)
WHERE `salary_min` IS NOT NULL AND `salary_max` IS NOT NULL;

UPDATE `jobs`
SET `salary_label` = CONCAT('À partir de ', CAST(`salary_min` AS UNSIGNED), ' € / an')
WHERE `salary_min` IS NOT NULL AND `salary_max` IS NULL;

UPDATE `jobs`
SET `salary_label` = CONCAT('Jusqu''à ', CAST(`salary_max` AS UNSIGNED), ' € / an')
WHERE `salary_min` IS NULL AND `salary_max` IS NOT NULL;

ALTER TABLE `jobs` DROP CHECK `chk_jobs_salary_range`;
ALTER TABLE `jobs` DROP INDEX `idx_jobs_salary_range`;
ALTER TABLE `jobs`
  DROP COLUMN `salary_min`,
  DROP COLUMN `salary_max`;
