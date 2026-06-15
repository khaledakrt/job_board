ALTER TABLE `applications`
  ADD COLUMN `interview_response_status` ENUM('confirmed', 'reschedule_requested') NULL DEFAULT NULL AFTER `interview_at`,
  ADD COLUMN `interview_response_message` TEXT NULL DEFAULT NULL AFTER `interview_response_status`,
  ADD COLUMN `interview_response_availability` VARCHAR(500) NULL DEFAULT NULL AFTER `interview_response_message`,
  ADD COLUMN `interview_responded_at` DATETIME NULL DEFAULT NULL AFTER `interview_response_availability`;

ALTER TABLE `recruiter_notifications`
  MODIFY COLUMN `type` ENUM('application_received', 'interview_response') NOT NULL DEFAULT 'application_received';
