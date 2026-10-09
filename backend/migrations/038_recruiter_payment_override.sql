ALTER TABLE `recruiter_profiles`
  ADD COLUMN `payment_override` ENUM('inherit', 'free', 'required') NOT NULL DEFAULT 'inherit' AFTER `can_edit_company`;
