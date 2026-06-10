UPDATE `jobs` j
LEFT JOIN (
  SELECT `job_id`, COUNT(*) AS `applications_total`
  FROM `applications`
  GROUP BY `job_id`
) a ON a.`job_id` = j.`id`
SET j.`applications_count` = COALESCE(a.`applications_total`, 0);
