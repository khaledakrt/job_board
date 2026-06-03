'use strict';

/**
 * Generates a tailored 3-paragraph cover letter from job and candidate context.
 */
function generateCoverLetter({ candidate, job, company }) {
  const firstName = candidate.first_name || 'Candidate';
  const lastName = candidate.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim();
  const title = candidate.professional_title || 'professional';
  const skills = Array.isArray(candidate.skills) ? candidate.skills.slice(0, 5) : [];
  const skillsText = skills.length > 0 ? skills.join(', ') : 'relevant technical and soft skills';

  const companyName = company?.name || 'your organization';
  const jobTitle = job.title;
  const location = job.location ? ` based in ${job.location}` : '';
  const remoteType = job.remote_type ? ` (${job.remote_type})` : '';

  const paragraph1 =
    `Dear Hiring Team at ${companyName},\n\n` +
    `I am writing to express my strong interest in the ${jobTitle} position${location}${remoteType}. ` +
    `As a ${title}, I am confident that my background aligns closely with the responsibilities outlined in your posting.`;

  const paragraph2 =
    `Throughout my career, I have developed practical expertise in ${skillsText}. ` +
    `Your job description highlights requirements that map directly to my experience, including deliverables mentioned in the role overview. ` +
    `I am particularly motivated by ${companyName}'s focus and the opportunity to contribute to meaningful outcomes in this position.`;

  const paragraph3 =
    `I would welcome the opportunity to discuss how my profile, including the strengths presented in my resume, ` +
    `can support your team’s goals for the ${jobTitle} role. Thank you for your time and consideration.\n\n` +
    `Sincerely,\n${fullName}`;

  const paragraphs = [paragraph1, paragraph2, paragraph3];
  const fullText = paragraphs.join('\n\n');

  return {
    paragraphs,
    fullText,
    metadata: {
      jobId: job.id,
      jobTitle,
      companyName,
      generatedAt: new Date().toISOString(),
    },
  };
}

module.exports = { generateCoverLetter };
