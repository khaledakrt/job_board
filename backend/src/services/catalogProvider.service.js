'use strict';

const {
  User,
  TrainingCenter,
  TrainingCourse,
  TrainingFormation,
  TrainingEvent,
  PrivateInstitution,
} = require('../models');
const {
  USER_ROLES,
  CATALOG_PUBLISH_STATUS,
} = require('../config/constants');
const ApiError = require('../utils/ApiError');
const { generateUuid } = require('../utils/uuid');
const { hashPassword } = require('../utils/password');
const { parseJsonArray, shortText } = require('../utils/catalogJson');
const {
  formatTrainingCenterDetail,
  formatInstitutionDetail,
} = require('./publicCatalog.service');

const catalogParticipationsService = require('./catalogParticipations.service');
const institutionOfferingsService = require('./institutionOfferings.service');
const {
  isProfileComplete,
  getTrainingCenterForUser,
  getInstitutionForUser,
} = require('../utils/catalogProviderAccess.util');

async function registerProvider({ providerType, email, password, organizationName, city, phone }) {
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw ApiError.conflict('Cet e-mail est déjà utilisé');
  }

  const role =
    providerType === 'training_center'
      ? USER_ROLES.TRAINING_PROVIDER
      : USER_ROLES.INSTITUTION_PROVIDER;

  const userId = generateUuid();
  const passwordHash = await hashPassword(password);

  await User.create({
    id: userId,
    email,
    password_hash: passwordHash,
    role,
    is_verified: false,
    verification_token: null,
    reset_token: null,
    reset_expires: null,
    created_at: new Date(),
  });

  if (providerType === 'training_center') {
    await TrainingCenter.create({
      id: generateUuid(),
      user_id: userId,
      name: organizationName,
      city: city ?? null,
      phone: phone ?? null,
      email,
      description: 'Profil en cours de complétion.',
      short_description: shortText('Profil en cours de complétion.', 200),
      status: CATALOG_PUBLISH_STATUS.PENDING,
    });
  } else {
    await PrivateInstitution.create({
      id: generateUuid(),
      user_id: userId,
      name: organizationName,
      institution_type: 'high_school',
      city: city ?? null,
      phone: phone ?? null,
      email,
      description: 'Profil en cours de complétion.',
      short_description: shortText('Profil en cours de complétion.', 200),
      programs_json: [],
      status: CATALOG_PUBLISH_STATUS.PENDING,
    });
  }

  return {
    email,
    role,
    message:
      'Inscription enregistrée. Un administrateur validera votre demande ; vous recevrez alors l’accès à votre espace.',
  };
}

async function getTrainingProviderDashboard(user) {
  const center = await getTrainingCenterForUser(user.id);
  const [courses, formations, events] = await Promise.all([
    TrainingCourse.findAll({
      where: { center_id: center.id },
      order: [['created_at', 'DESC']],
    }),
    TrainingFormation.findAll({
      where: { center_id: center.id },
      order: [['created_at', 'DESC']],
    }),
    TrainingEvent.findAll({
      where: { center_id: center.id },
      order: [['created_at', 'DESC']],
    }),
  ]);
  const publishedCourses = courses.filter((c) => c.status === 'published');
  const participationsSummary = await catalogParticipationsService.countParticipationsForCenter(
    center.id
  );

  return {
    accountStatus: center.status,
    canPublishOfferings: center.status === CATALOG_PUBLISH_STATUS.PUBLISHED,
    participationsSummary,
    formationsSummary: {
      total: formations.length,
      pending: formations.filter((f) => f.status === CATALOG_PUBLISH_STATUS.PENDING).length,
      published: formations.filter((f) => f.status === CATALOG_PUBLISH_STATUS.PUBLISHED).length,
    },
    eventsSummary: {
      total: events.length,
      pending: events.filter((e) => e.status === CATALOG_PUBLISH_STATUS.PENDING).length,
      published: events.filter((e) => e.status === CATALOG_PUBLISH_STATUS.PUBLISHED).length,
    },
    profileComplete: isProfileComplete(center),
    organization: formatTrainingCenterDetail(center, courses),
    stats: {
      totalCourses: courses.length,
      publishedCourses: publishedCourses.length,
    },
  };
}

async function getInstitutionProviderDashboard(user) {
  const row = await getInstitutionForUser(user.id);
  const programs = parseJsonArray(row.programs_json);
  const offeringStats = await institutionOfferingsService.providerStats(user.id);

  return {
    accountStatus: row.status,
    canPublishOfferings: row.status === CATALOG_PUBLISH_STATUS.PUBLISHED,
    profileComplete: isProfileComplete(row),
    organization: formatInstitutionDetail(row),
    stats: {
      totalPrograms: programs.length,
      ...offeringStats,
    },
  };
}

async function updateTrainingCenterProfile(userId, payload) {
  const center = await getTrainingCenterForUser(userId);

  const fields = {
    name: payload.name,
    description: payload.description,
    address: payload.address,
    city: payload.city,
    phone: payload.phone,
    email: payload.email,
    website: payload.website,
    training_domain: payload.trainingDomain,
    delivery_mode: payload.deliveryMode,
    photos_json: payload.photoUrls,
    social_links_json: payload.socialLinks,
  };

  Object.entries(fields).forEach(([key, val]) => {
    if (val !== undefined) {
      center[key] = val;
    }
  });

  if (payload.description) {
    center.short_description = shortText(payload.description, 200);
  }

  await center.save();
  return getTrainingProviderDashboard({ id: userId, role: USER_ROLES.TRAINING_PROVIDER });
}

async function updateInstitutionProfile(userId, payload) {
  const row = await getInstitutionForUser(userId);

  if (payload.name !== undefined) row.name = payload.name;
  if (payload.description !== undefined) {
    row.description = payload.description;
    row.short_description = shortText(payload.description, 200);
  }
  if (payload.address !== undefined) row.address = payload.address;
  if (payload.city !== undefined) row.city = payload.city;
  if (payload.phone !== undefined) row.phone = payload.phone;
  if (payload.email !== undefined) row.email = payload.email;
  if (payload.website !== undefined) row.website = payload.website;
  if (payload.mapUrl !== undefined) row.map_url = payload.mapUrl;
  if (payload.institutionType !== undefined) row.institution_type = payload.institutionType;
  if (payload.photoUrls !== undefined) row.photos_json = payload.photoUrls;
  if (payload.socialLinks !== undefined) row.social_links_json = payload.socialLinks;

  await row.save();
  return getInstitutionProviderDashboard({ id: userId, role: USER_ROLES.INSTITUTION_PROVIDER });
}

async function setTrainingCenterLogo(userId, logoUrl) {
  const center = await getTrainingCenterForUser(userId);
  center.logo_url = logoUrl;
  await center.save();
  return { logoUrl: center.logo_url };
}

async function setInstitutionLogo(userId, logoUrl) {
  const row = await getInstitutionForUser(userId);
  row.logo_url = logoUrl;
  await row.save();
  return { logoUrl: row.logo_url };
}

async function addTrainingCenterBrochure(userId, brochureUrl) {
  const center = await getTrainingCenterForUser(userId);
  const list = parseJsonArray(center.brochures_json);
  if (!list.includes(brochureUrl)) {
    list.push(brochureUrl);
  }
  center.brochures_json = list;
  await center.save();
  return { brochures: list };
}

async function addInstitutionBrochure(userId, brochureUrl) {
  const row = await getInstitutionForUser(userId);
  const list = parseJsonArray(row.brochures_json);
  if (!list.includes(brochureUrl)) {
    list.push(brochureUrl);
  }
  row.brochures_json = list;
  await row.save();
  return { brochures: list };
}

async function listTrainingCourses(userId) {
  const center = await getTrainingCenterForUser(userId);
  const courses = await TrainingCourse.findAll({
    where: { center_id: center.id },
    order: [['created_at', 'DESC']],
  });
  return courses.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    deliveryMode: c.delivery_mode,
    status: c.status,
    createdAt: c.created_at,
  }));
}

async function createTrainingCourse(userId, payload) {
  const center = await getTrainingCenterForUser(userId);
  if (center.status !== CATALOG_PUBLISH_STATUS.PUBLISHED) {
    throw ApiError.forbidden(
      'Votre compte doit être validé par un administrateur avant de publier des formations.'
    );
  }
  if (!isProfileComplete(center)) {
    throw ApiError.forbidden('Complétez votre profil (logo, description, ville) avant de publier.');
  }

  const course = await TrainingCourse.create({
    id: generateUuid(),
    center_id: center.id,
    title: payload.title,
    description: payload.description ?? null,
    delivery_mode: payload.deliveryMode ?? center.delivery_mode ?? null,
    status: payload.status ?? 'published',
  });

  return {
    id: course.id,
    title: course.title,
    description: course.description,
    deliveryMode: course.delivery_mode,
    status: course.status,
  };
}

async function updateTrainingCourse(userId, courseId, payload) {
  const center = await getTrainingCenterForUser(userId);
  const course = await TrainingCourse.findOne({
    where: { id: courseId, center_id: center.id },
  });
  if (!course) {
    throw ApiError.notFound('Formation introuvable');
  }

  if (payload.title !== undefined) course.title = payload.title;
  if (payload.description !== undefined) course.description = payload.description;
  if (payload.deliveryMode !== undefined) course.delivery_mode = payload.deliveryMode;
  if (payload.status !== undefined) course.status = payload.status;

  await course.save();
  return {
    id: course.id,
    title: course.title,
    description: course.description,
    deliveryMode: course.delivery_mode,
    status: course.status,
  };
}

async function deleteTrainingCourse(userId, courseId) {
  const center = await getTrainingCenterForUser(userId);
  const deleted = await TrainingCourse.destroy({
    where: { id: courseId, center_id: center.id },
  });
  if (!deleted) {
    throw ApiError.notFound('Formation introuvable');
  }
  return { success: true };
}

async function listInstitutionPrograms(userId) {
  const row = await getInstitutionForUser(userId);
  return parseJsonArray(row.programs_json);
}

async function addInstitutionProgram(userId, payload) {
  const row = await getInstitutionForUser(userId);
  if (row.status !== CATALOG_PUBLISH_STATUS.PUBLISHED) {
    throw ApiError.forbidden(
      'Votre compte doit être validé par un administrateur avant de publier des programmes.'
    );
  }
  if (!isProfileComplete(row)) {
    throw ApiError.forbidden('Complétez votre profil (logo, description, ville) avant de publier.');
  }

  const programs = parseJsonArray(row.programs_json);
  programs.push({
    id: generateUuid(),
    title: payload.title,
    description: payload.description ?? null,
  });
  row.programs_json = programs;
  await row.save();
  return programs;
}

async function updateInstitutionProgram(userId, index, payload) {
  const row = await getInstitutionForUser(userId);
  const programs = parseJsonArray(row.programs_json);
  if (index < 0 || index >= programs.length) {
    throw ApiError.notFound('Programme introuvable');
  }
  programs[index] = {
    ...programs[index],
    title: payload.title ?? programs[index].title,
    description: payload.description ?? programs[index].description,
  };
  row.programs_json = programs;
  await row.save();
  return programs;
}

async function deleteInstitutionProgram(userId, index) {
  const row = await getInstitutionForUser(userId);
  const programs = parseJsonArray(row.programs_json);
  if (index < 0 || index >= programs.length) {
    throw ApiError.notFound('Programme introuvable');
  }
  programs.splice(index, 1);
  row.programs_json = programs;
  await row.save();
  return programs;
}

module.exports = {
  registerProvider,
  getTrainingCenterForUser,
  getInstitutionForUser,
  isProfileComplete,
  getTrainingProviderDashboard,
  getInstitutionProviderDashboard,
  updateTrainingCenterProfile,
  updateInstitutionProfile,
  setTrainingCenterLogo,
  setInstitutionLogo,
  addTrainingCenterBrochure,
  addInstitutionBrochure,
  listTrainingCourses,
  createTrainingCourse,
  updateTrainingCourse,
  deleteTrainingCourse,
  listInstitutionPrograms,
  addInstitutionProgram,
  updateInstitutionProgram,
  deleteInstitutionProgram,
};
