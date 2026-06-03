-- Optional pre-application quiz per job (2 questions, 3 choices each)
ALTER TABLE jobs
  ADD COLUMN quiz_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER applications_count,
  ADD COLUMN quiz_data JSON NULL AFTER quiz_enabled;

ALTER TABLE applications
  ADD COLUMN quiz_answers JSON NULL AFTER cover_letter;
