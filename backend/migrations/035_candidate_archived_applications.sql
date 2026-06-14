ALTER TABLE `applications`
  ADD COLUMN `candidate_archived_at` DATETIME NULL DEFAULT NULL AFTER `deleted_by_recruiter_by`,
  ADD KEY `idx_applications_candidate_archive` (`candidate_id`, `candidate_archived_at`);
