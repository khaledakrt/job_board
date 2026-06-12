-- Separate internal recruiter notes from candidate-visible messages.

SET NAMES utf8mb4;

ALTER TABLE `application_notes`
  ADD COLUMN `visible_to_candidate` TINYINT(1) NOT NULL DEFAULT 0 AFTER `note_text`,
  ADD KEY `idx_application_notes_visible` (`application_id`, `visible_to_candidate`, `created_at`);
