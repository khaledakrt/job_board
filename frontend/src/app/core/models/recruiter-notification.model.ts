export type RecruiterNotificationType = 'application_received';

export interface RecruiterNotification {
  id: string;
  type: RecruiterNotificationType;
  title: string;
  messageText: string;
  applicationId: string;
  jobId: string;
  candidateId: string;
  candidateName: string;
  candidateAvatarUrl: string | null;
  jobTitle: string;
  isRead: boolean;
  createdAt: string;
}
