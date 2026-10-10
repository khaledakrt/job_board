ALTER TABLE `recruiter_profiles`
  ADD COLUMN `first_name` VARCHAR(100) NULL AFTER `user_id`,
  ADD COLUMN `last_name` VARCHAR(100) NULL AFTER `first_name`;
