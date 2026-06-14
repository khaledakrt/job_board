UPDATE `applications`
SET `interview_at` = NULL
WHERE `status` <> 'interview'
  AND `interview_at` IS NOT NULL;
