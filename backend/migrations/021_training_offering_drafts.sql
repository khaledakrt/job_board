ALTER TABLE training_formations
  MODIFY status ENUM('draft', 'pending', 'published', 'rejected') NOT NULL DEFAULT 'pending';

ALTER TABLE training_events
  MODIFY status ENUM('draft', 'pending', 'published', 'rejected') NOT NULL DEFAULT 'pending';
