'use strict';

const {
  createProfileSchema,
  updateProfileSchema,
  generateLetterSchema,
  applyToJobSchema,
} = require('../../../backend/src/validators/candidateProfile.validator');

describe('Candidate unit - validators', () => {
  test('create profile requires firstName', () => {
    const result = createProfileSchema.safeParse({ lastName: 'Candidate' });
    expect(result.success).toBe(false);
  });

  test('create profile accepts structured candidate profile payload', () => {
    const result = createProfileSchema.safeParse({
      firstName: 'Amina',
      lastName: 'Candidate',
      phone: '+21620000000',
      professionalTitle: 'Developpeuse Angular',
      skills: ['Angular', 'Node.js'],
      languages: ['Francais', 'Anglais'],
      certifications: ['AWS'],
      experiences: [{ title: 'Frontend', company: 'Test', current: true }],
      education: [{ institution: 'Universite', degree: 'Licence' }],
      linkedinUrl: 'https://linkedin.com/in/test',
      portfolioUrl: 'https://portfolio.example.com',
      minSalary: 2500,
      jobPreferences: {
        preferredLocations: ['Tunis'],
        remoteTypes: ['hybrid'],
      },
      notificationPreferences: {
        emailEnabled: true,
        inAppEnabled: true,
      },
    });

    expect(result.success).toBe(true);
    expect(result.data.skills).toEqual(['Angular', 'Node.js']);
  });

  test('update profile accepts notification preferences only', () => {
    const result = updateProfileSchema.safeParse({
      notificationPreferences: {
        emailEnabled: false,
        inAppEnabled: true,
        statusChange: true,
        recruiterMessage: true,
        jobAlert: false,
      },
    });

    expect(result.success).toBe(true);
  });

  test('generate letter requires uuid jobId', () => {
    expect(generateLetterSchema.safeParse({ jobId: 'bad-id' }).success).toBe(false);
    expect(
      generateLetterSchema.safeParse({ jobId: '11111111-1111-4111-8111-111111111111' }).success
    ).toBe(true);
  });

  test('apply payload normalizes empty cover letter and validates quiz answer shape', () => {
    const result = applyToJobSchema.safeParse({
      coverLetter: '',
      quizAnswers: [{ questionIndex: 0, choiceIndex: 1 }],
    });

    expect(result.success).toBe(true);
    expect(result.data.coverLetter).toBeNull();
    expect(result.data.quizAnswers).toEqual([{ questionIndex: 0, choiceIndex: 1 }]);
  });
});
