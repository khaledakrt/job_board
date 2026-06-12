'use strict';

const { Op } = require('sequelize');
const sequelize = require('../database/sequelize');
const {
  User,
  TrainingCenter,
  TrainingCourse,
  TrainingFormation,
  TrainingEvent,
  PrivateInstitution,
  InstitutionOffering,
  InstitutionParticipation,
  FormationParticipation,
  EventParticipation,
} = require('../models');
const { formatFormation, formatEvent } = require('../utils/catalogOfferingFormat.util');
const catalogParticipationsService = require('./catalogParticipations.service');
const {
  CATALOG_PUBLISH_STATUS,
  CATALOG_PUBLIC_STATUSES,
  PARTICIPATION_TYPES,
  USER_ROLES,
} = require('../config/constants');
const ApiError = require('../utils/ApiError');
const { generateUuid } = require('../utils/uuid');
const { parsePagination, buildPaginatedResponse } = require('../utils/pagination');
const { parseJsonArray, shortText } = require('../utils/catalogJson');
const { isProfileComplete } = require('../utils/catalogProviderAccess.util');

function formatSocialLinks(raw) {
  return parseJsonArray(raw).filter((item) => item && item.url);
}

function formatPhotos(raw) {
  return parseJsonArray(raw).filter((url) => typeof url === 'string' && url.trim());
}

function formatTrainingCenterCard(center, courseCount = 0, publishedOfferingsCount = courseCount) {
  return {
    id: center.id,
    name: center.name,
    logoUrl: center.logo_url,
    city: center.city,
    trainingDomain: center.training_domain,
    deliveryMode: center.delivery_mode,
    shortDescription:
      center.short_description || shortText(center.description, 180),
    courseCount,
    publishedOfferingsCount,
  };
}

function formatTrainingCenterDetail(center, courses, formations = [], events = [], countMaps = {}) {
  const formationCounts = countMaps.formationCounts ?? new Map();
  const eventCounts = countMaps.eventCounts ?? new Map();
  const formationParticipations = countMaps.formationParticipations ?? new Map();
  const eventParticipations = countMaps.eventParticipations ?? new Map();
  const publishedOfferingsCount = courses.length + formations.length + events.length;

  return {
    ...formatTrainingCenterCard(center, courses.length, publishedOfferingsCount),
    description: center.description,
    address: center.address,
    phone: center.phone,
    email: center.email,
    website: center.website,
    photos: formatPhotos(center.photos_json),
    socialLinks: formatSocialLinks(center.social_links_json),
    brochures: parseJsonArray(center.brochures_json),
    courses: courses.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      deliveryMode: c.delivery_mode || center.delivery_mode,
    })),
    formations: formations.map((f) =>
      formatFormation(f, {
        centerName: center.name,
        participationType: formationParticipations.get(f.id) ?? null,
        participantsCount: catalogParticipationsService.publicParticipantsCount(
          formationCounts.get(f.id) ?? 0,
          f.seats
        ),
      })
    ),
    events: events.map((e) =>
      formatEvent(e, {
        centerName: center.name,
        participationType: eventParticipations.get(e.id) ?? null,
        participantsCount: catalogParticipationsService.publicParticipantsCount(
          eventCounts.get(e.id) ?? 0,
          e.seats
        ),
      })
    ),
  };
}

function formatInstitutionCard(row) {
  return {
    id: row.id,
    name: row.name,
    institutionType: row.institution_type,
    logoUrl: row.logo_url,
    city: row.city,
    shortDescription:
      row.short_description || shortText(row.description, 180),
  };
}

function formatInstitutionDetail(row) {
  const programs = parseJsonArray(row.programs_json);
  return {
    ...formatInstitutionCard(row),
    description: row.description,
    address: row.address,
    phone: row.phone,
    email: row.email,
    website: row.website,
    mapUrl: row.map_url,
    photos: formatPhotos(row.photos_json),
    socialLinks: formatSocialLinks(row.social_links_json),
    brochures: parseJsonArray(row.brochures_json),
    programs,
    institutionOfferings: [],
  };
}

function formatInstitutionOffering(row) {
  return {
    id: row.id,
    institutionId: row.institution_id,
    offeringType: row.offering_type,
    title: row.title,
    summary: row.summary,
    description: row.description,
    category: row.category,
    eventType: row.event_type,
    opportunityType: row.opportunity_type,
    startDate: row.start_date,
    endDate: row.end_date,
    startTime: row.start_time,
    endTime: row.end_time,
    city: row.city,
    address: row.address,
    price: row.price != null ? Number(row.price) : null,
    seats: row.seats,
    mainImageUrl: row.main_image_url,
    gallery: parseJsonArray(row.gallery_json),
    phone: row.phone,
    email: row.email,
    website: row.website,
    status: row.status,
    adminNote: row.admin_note,
    viewsCount: row.views_count,
    clicksCount: row.clicks_count,
    registrationsCount: 0,
    participationType: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function countInstitutionRegistrationsByOfferingIds(offeringIds) {
  const map = new Map();
  if (!offeringIds.length) return map;
  const rows = await InstitutionParticipation.findAll({
    where: {
      offering_id: { [Op.in]: offeringIds },
      participation_type: PARTICIPATION_TYPES.REGISTERED,
    },
    attributes: ['offering_id'],
  });
  rows.forEach((row) => {
    map.set(row.offering_id, (map.get(row.offering_id) || 0) + 1);
  });
  return map;
}

async function participationTypeForOfferings(offeringIds, userId) {
  const map = new Map();
  if (!offeringIds.length || !userId) return map;
  const rows = await InstitutionParticipation.findAll({
    where: {
      offering_id: { [Op.in]: offeringIds },
      user_id: userId,
    },
    attributes: ['offering_id', 'participation_type'],
  });
  rows.forEach((row) => map.set(row.offering_id, row.participation_type));
  return map;
}

async function attachInstitutionOfferings(detail, offerings, userId = null) {
  const ids = offerings.map((offering) => offering.id);
  const [registrations, participationTypes] = await Promise.all([
    countInstitutionRegistrationsByOfferingIds(ids),
    participationTypeForOfferings(ids, userId),
  ]);
  const formatted = offerings
    .map((offering) => ({
      ...formatInstitutionOffering(offering),
      registrationsCount: registrations.get(offering.id) ?? 0,
      participationType: participationTypes.get(offering.id) ?? null,
    }))
    .filter((offering) => offering.offeringType !== 'opportunity');
  return {
    ...detail,
    institutionOfferings: formatted,
    publishedPrograms: formatted.filter((o) => o.offeringType === 'program'),
    publishedEvents: formatted.filter((o) => o.offeringType === 'event'),
    publishedAnnouncements: formatted.filter((o) => o.offeringType === 'announcement'),
    publishedOpportunities: [],
  };
}

async function getPublishedInstitutionOfferingById(id, userId = null) {
  const row = await InstitutionOffering.findOne({
    where: {
      id,
      status: CATALOG_PUBLISH_STATUS.PUBLISHED,
      offering_type: { [Op.ne]: 'opportunity' },
    },
    include: [
      {
        model: PrivateInstitution,
        as: 'institution',
        where: { status: { [Op.in]: [...CATALOG_PUBLIC_STATUSES] } },
        required: true,
      },
    ],
  });
  if (!row) throw ApiError.notFound('Publication introuvable ou non publiée');
  await row.increment('views_count');
  row.views_count = (row.views_count || 0) + 1;
  const [registrations, participationTypes] = await Promise.all([
    countInstitutionRegistrationsByOfferingIds([row.id]),
    participationTypeForOfferings([row.id], userId),
  ]);
  return {
    ...formatInstitutionOffering(row),
    registrationsCount: registrations.get(row.id) ?? 0,
    participationType: participationTypes.get(row.id) ?? null,
    institution: formatInstitutionCard(row.institution),
  };
}

async function getPublishedInstitutionOfferingPreviewById(id) {
  const row = await InstitutionOffering.findOne({
    where: {
      id,
      status: CATALOG_PUBLISH_STATUS.PUBLISHED,
      offering_type: { [Op.ne]: 'opportunity' },
    },
    include: [
      {
        model: PrivateInstitution,
        as: 'institution',
        where: { status: { [Op.in]: [...CATALOG_PUBLIC_STATUSES] } },
        required: true,
      },
    ],
  });
  if (!row) throw ApiError.notFound('Publication introuvable ou non publiée');
  return {
    ...formatInstitutionOffering(row),
    institution: formatInstitutionCard(row.institution),
  };
}

async function syncProviderUserOnStatus(userId, status) {
  if (!userId) return;
  if (status === CATALOG_PUBLISH_STATUS.PUBLISHED) {
    await User.update({ is_verified: true }, { where: { id: userId } });
  } else if (status === CATALOG_PUBLISH_STATUS.REJECTED) {
    await User.update({ is_verified: false }, { where: { id: userId } });
  }
}

function buildCenterWhere(query) {
  const where = { status: { [Op.in]: [...CATALOG_PUBLIC_STATUSES] } };
  if (query.city) {
    where.city = { [Op.like]: `%${query.city}%` };
  }
  if (query.domain) {
    where.training_domain = { [Op.like]: `%${query.domain}%` };
  }
  if (query.deliveryMode) {
    where.delivery_mode = query.deliveryMode;
  }
  if (query.search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${query.search}%` } },
      { description: { [Op.like]: `%${query.search}%` } },
      { training_domain: { [Op.like]: `%${query.search}%` } },
    ];
  }
  return where;
}

function buildInstitutionWhere(query) {
  const where = { status: { [Op.in]: [...CATALOG_PUBLIC_STATUSES] } };
  if (query.city) {
    where.city = { [Op.like]: `%${query.city}%` };
  }
  if (query.type) {
    where.institution_type = query.type;
  }
  if (query.search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${query.search}%` } },
      { description: { [Op.like]: `%${query.search}%` } },
    ];
  }
  return where;
}

async function listTrainingCenters(query) {
  const { page, limit, offset } = parsePagination(query);
  const where = buildCenterWhere(query);

  const { rows, count } = await TrainingCenter.findAndCountAll({
    where,
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  const ids = rows.map((row) => row.id);
  const courseCounts = {};
  const formationCounts = {};
  const eventCounts = {};
  if (ids.length) {
    const [groupedCourses, groupedFormations, groupedEvents] = await Promise.all([
      TrainingCourse.findAll({
        attributes: ['center_id', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']],
        where: { center_id: { [Op.in]: ids }, status: 'published' },
        group: ['center_id'],
        raw: true,
      }),
      TrainingFormation.findAll({
        attributes: ['center_id', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']],
        where: { center_id: { [Op.in]: ids }, status: CATALOG_PUBLISH_STATUS.PUBLISHED },
        group: ['center_id'],
        raw: true,
      }),
      TrainingEvent.findAll({
        attributes: ['center_id', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']],
        where: { center_id: { [Op.in]: ids }, status: CATALOG_PUBLISH_STATUS.PUBLISHED },
        group: ['center_id'],
        raw: true,
      }),
    ]);
    groupedCourses.forEach((g) => {
      courseCounts[g.center_id] = Number(g.cnt) || 0;
    });
    groupedFormations.forEach((g) => {
      formationCounts[g.center_id] = Number(g.cnt) || 0;
    });
    groupedEvents.forEach((g) => {
      eventCounts[g.center_id] = Number(g.cnt) || 0;
    });
  }

  const items = rows.map((row) =>
    formatTrainingCenterCard(
      row,
      courseCounts[row.id] || 0,
      (courseCounts[row.id] || 0) + (formationCounts[row.id] || 0) + (eventCounts[row.id] || 0)
    )
  );

  return buildPaginatedResponse({ rows: items, count, page, limit });
}

async function participationTypesForTrainingContent(formationIds, eventIds, userId) {
  const formationParticipations = new Map();
  const eventParticipations = new Map();
  if (!userId) return { formationParticipations, eventParticipations };

  const [formationRows, eventRows] = await Promise.all([
    formationIds.length
      ? FormationParticipation.findAll({
          where: { formation_id: { [Op.in]: formationIds }, user_id: userId },
          attributes: ['formation_id', 'participation_type'],
        })
      : [],
    eventIds.length
      ? EventParticipation.findAll({
          where: { event_id: { [Op.in]: eventIds }, user_id: userId },
          attributes: ['event_id', 'participation_type'],
        })
      : [],
  ]);

  formationRows.forEach((row) =>
    formationParticipations.set(row.formation_id, row.participation_type)
  );
  eventRows.forEach((row) => eventParticipations.set(row.event_id, row.participation_type));

  return { formationParticipations, eventParticipations };
}

async function getTrainingCenterById(id, userId = null) {
  const center = await TrainingCenter.findOne({
    where: { id, status: { [Op.in]: [...CATALOG_PUBLIC_STATUSES] } },
    include: [
      {
        model: TrainingCourse,
        as: 'courses',
        where: { status: 'published' },
        required: false,
      },
    ],
  });
  if (!center) {
    throw ApiError.notFound('Centre de formation introuvable');
  }

  const [formations, events] = await Promise.all([
    TrainingFormation.findAll({
      where: { center_id: id, status: CATALOG_PUBLISH_STATUS.PUBLISHED },
      order: [['start_date', 'ASC'], ['created_at', 'DESC']],
    }),
    TrainingEvent.findAll({
      where: { center_id: id, status: CATALOG_PUBLISH_STATUS.PUBLISHED },
      order: [['event_date', 'ASC'], ['created_at', 'DESC']],
    }),
  ]);

  const formationIds = formations.map((f) => f.id);
  const eventIds = events.map((e) => e.id);
  const [formationCounts, eventCounts, participationMaps] = await Promise.all([
    catalogParticipationsService.countRegisteredByFormationIds(formationIds),
    catalogParticipationsService.countRegisteredByEventIds(eventIds),
    participationTypesForTrainingContent(formationIds, eventIds, userId),
  ]);

  return formatTrainingCenterDetail(center, center.courses || [], formations, events, {
    formationCounts,
    eventCounts,
    ...participationMaps,
  });
}

async function listPrivateInstitutions(query) {
  const { page, limit, offset } = parsePagination(query);
  const where = buildInstitutionWhere(query);

  const { rows, count } = await PrivateInstitution.findAndCountAll({
    where,
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  return buildPaginatedResponse({
    rows: rows.map(formatInstitutionCard),
    count,
    page,
    limit,
  });
}

async function getPrivateInstitutionById(id, userId = null) {
  const row = await PrivateInstitution.findOne({
    where: { id, status: { [Op.in]: [...CATALOG_PUBLIC_STATUSES] } },
  });
  if (!row) {
    throw ApiError.notFound('Établissement introuvable');
  }
  const offerings = await InstitutionOffering.findAll({
    where: {
      institution_id: id,
      status: CATALOG_PUBLISH_STATUS.PUBLISHED,
      offering_type: { [Op.ne]: 'opportunity' },
    },
    order: [['start_date', 'ASC'], ['created_at', 'DESC']],
  });
  return attachInstitutionOfferings(formatInstitutionDetail(row), offerings, userId);
}

async function listPublishedInstitutionOfferingsForInstitution(institutionId, query = {}, userId = null) {
  const institution = await PrivateInstitution.findOne({
    where: { id: institutionId, status: { [Op.in]: [...CATALOG_PUBLIC_STATUSES] } },
  });
  if (!institution) {
    throw ApiError.notFound('Établissement introuvable');
  }

  const { page, limit, offset } = parsePagination(query);
  const where = {
    institution_id: institutionId,
    status: CATALOG_PUBLISH_STATUS.PUBLISHED,
    offering_type: { [Op.ne]: 'opportunity' },
  };
  if (query.type) where.offering_type = query.type;
  if (query.search) {
    where[Op.or] = [
      { title: { [Op.like]: `%${query.search}%` } },
      { summary: { [Op.like]: `%${query.search}%` } },
      { category: { [Op.like]: `%${query.search}%` } },
      { city: { [Op.like]: `%${query.search}%` } },
    ];
  }

  const { rows, count } = await InstitutionOffering.findAndCountAll({
    where,
    order: [['start_date', 'ASC'], ['created_at', 'DESC']],
    limit,
    offset,
  });
  const detail = await attachInstitutionOfferings(formatInstitutionDetail(institution), rows, userId);
  return buildPaginatedResponse({
    rows: detail.institutionOfferings,
    count,
    page,
    limit,
  });
}

function assertCandidateUser(user) {
  if (!user) throw ApiError.unauthorized('Connexion requise');
  if (user.role !== USER_ROLES.CANDIDATE) {
    throw ApiError.forbidden('Seuls les candidats connectés peuvent effectuer cette action');
  }
}

async function assertInstitutionRegistrationAllowed(offering) {
  if (!offering?.seats || offering.seats <= 0) return;
  const registeredCount = await InstitutionParticipation.count({
    where: {
      offering_id: offering.id,
      participation_type: PARTICIPATION_TYPES.REGISTERED,
    },
  });
  if (registeredCount >= offering.seats) {
    throw ApiError.conflict('Plus de places disponibles pour cette publication.');
  }
}

async function participateInstitutionOffering(id, user, participationType) {
  assertCandidateUser(user);

  await sequelize.transaction(async (transaction) => {
    const offering = await InstitutionOffering.findOne({
      where: {
        id,
        status: CATALOG_PUBLISH_STATUS.PUBLISHED,
        offering_type: { [Op.ne]: 'opportunity' },
      },
      include: [
        {
          model: PrivateInstitution,
          as: 'institution',
          where: { status: { [Op.in]: [...CATALOG_PUBLIC_STATUSES] } },
          required: true,
        },
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!offering) throw ApiError.notFound('Publication introuvable ou non publiée');

    const existing = await InstitutionParticipation.findOne({
      where: { offering_id: id, user_id: user.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (existing) {
      throw ApiError.conflict('Vous avez déjà répondu à cette publication.');
    }

    if (participationType === PARTICIPATION_TYPES.REGISTERED && offering.seats > 0) {
      const registeredCount = await InstitutionParticipation.count({
        where: {
          offering_id: id,
          participation_type: PARTICIPATION_TYPES.REGISTERED,
        },
        transaction,
      });
      if (registeredCount >= offering.seats) {
        throw ApiError.conflict('Plus de places disponibles pour cette publication.');
      }
    }

    await InstitutionParticipation.create({
      id: generateUuid(),
      offering_id: id,
      user_id: user.id,
      participation_type: participationType,
      created_at: new Date(),
    }, { transaction });
  });

  return { participationType, updated: false };
}

async function submitPrivateInstitution(payload) {
  const id = generateUuid();
  const shortDescription = shortText(payload.description, 200);

  await PrivateInstitution.create({
    id,
    name: payload.name,
    institution_type: payload.institutionType,
    logo_url: payload.logoUrl ?? null,
    description: payload.description,
    short_description: shortDescription,
    city: payload.city ?? null,
    address: payload.address ?? null,
    phone: payload.phone ?? null,
    email: payload.email ?? null,
    website: payload.website ?? null,
    map_url: payload.mapUrl ?? null,
    photos_json: payload.photoUrls ?? [],
    social_links_json: payload.socialLinks ?? [],
    programs_json: payload.programs ?? [],
    status: CATALOG_PUBLISH_STATUS.PENDING,
  });

  return {
    id,
    status: CATALOG_PUBLISH_STATUS.PENDING,
    message:
      'Votre établissement a été envoyé. Il sera visible après validation par un administrateur.',
  };
}

function formatAdminTrainingCenterListRow(c) {
  return {
    id: c.id,
    name: c.name,
    city: c.city,
    phone: c.phone,
    email: c.email,
    trainingDomain: c.training_domain,
    status: c.status,
    ownerEmail: c.owner?.email ?? null,
    createdAt: c.created_at,
  };
}

function formatAdminInstitutionListRow(c) {
  return {
    id: c.id,
    name: c.name,
    city: c.city,
    phone: c.phone,
    email: c.email,
    institutionType: c.institution_type,
    status: c.status,
    ownerEmail: c.owner?.email ?? null,
    createdAt: c.created_at,
  };
}

async function adminGetTrainingCenterById(id) {
  const center = await TrainingCenter.findByPk(id, {
    include: [{ model: User, as: 'owner', attributes: ['id', 'email', 'is_verified'] }],
  });
  if (!center) throw ApiError.notFound('Centre introuvable');

  const courses = await TrainingCourse.findAll({
    where: { center_id: id },
    order: [['created_at', 'DESC']],
  });

  return {
    ...formatTrainingCenterDetail(center, courses),
    status: center.status,
    ownerEmail: center.owner?.email ?? null,
    ownerId: center.user_id,
    ownerVerified: center.owner ? Boolean(center.owner.is_verified) : null,
    createdAt: center.created_at,
    updatedAt: center.updated_at,
    courses: courses.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      deliveryMode: c.delivery_mode || center.delivery_mode,
      status: c.status,
    })),
  };
}

async function adminGetPrivateInstitutionById(id) {
  const row = await PrivateInstitution.findByPk(id, {
    include: [{ model: User, as: 'owner', attributes: ['id', 'email', 'is_verified'] }],
  });
  if (!row) throw ApiError.notFound('Établissement introuvable');

  const offerings = await InstitutionOffering.findAll({
    where: {
      institution_id: id,
      offering_type: { [Op.ne]: 'opportunity' },
    },
    order: [['created_at', 'DESC']],
  });
  const detail = await attachInstitutionOfferings(formatInstitutionDetail(row), offerings);
  return {
    ...detail,
    status: row.status,
    ownerEmail: row.owner?.email ?? null,
    ownerId: row.user_id,
    ownerVerified: row.owner ? Boolean(row.owner.is_verified) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function adminCreateTrainingCenter(payload) {
  const id = generateUuid();
  await TrainingCenter.create({
    id,
    user_id: null,
    name: payload.name,
    description: payload.description ?? null,
    short_description: shortText(payload.description, 180),
    city: payload.city ?? null,
    address: payload.address ?? null,
    phone: payload.phone ?? null,
    email: payload.email ?? null,
    website: payload.website ?? null,
    training_domain: payload.trainingDomain ?? null,
    delivery_mode: payload.deliveryMode ?? null,
    status: payload.status ?? CATALOG_PUBLISH_STATUS.PUBLISHED,
  });
  return adminGetTrainingCenterById(id);
}

async function adminUpdateTrainingCenter(id, payload) {
  const center = await TrainingCenter.findByPk(id);
  if (!center) throw ApiError.notFound('Centre introuvable');

  if (payload.name !== undefined) center.name = payload.name;
  if (payload.description !== undefined) {
    center.description = payload.description;
    center.short_description = shortText(payload.description, 180);
  }
  if (payload.city !== undefined) center.city = payload.city;
  if (payload.address !== undefined) center.address = payload.address;
  if (payload.phone !== undefined) center.phone = payload.phone;
  if (payload.email !== undefined) center.email = payload.email;
  if (payload.website !== undefined) center.website = payload.website;
  if (payload.trainingDomain !== undefined) center.training_domain = payload.trainingDomain;
  if (payload.deliveryMode !== undefined) center.delivery_mode = payload.deliveryMode;
  if (payload.status !== undefined) {
    center.status = payload.status;
    await syncProviderUserOnStatus(center.user_id, payload.status);
  }

  await center.save();
  return adminGetTrainingCenterById(id);
}

async function adminCreatePrivateInstitution(payload) {
  const id = generateUuid();
  await PrivateInstitution.create({
    id,
    user_id: null,
    name: payload.name,
    institution_type: payload.institutionType,
    description: payload.description ?? null,
    short_description: shortText(payload.description, 180),
    city: payload.city ?? null,
    address: payload.address ?? null,
    phone: payload.phone ?? null,
    email: payload.email ?? null,
    website: payload.website ?? null,
    map_url: payload.mapUrl ?? null,
    programs_json: [],
    status: payload.status ?? CATALOG_PUBLISH_STATUS.PUBLISHED,
  });
  return adminGetPrivateInstitutionById(id);
}

async function adminUpdatePrivateInstitution(id, payload) {
  const row = await PrivateInstitution.findByPk(id);
  if (!row) throw ApiError.notFound('Établissement introuvable');

  if (payload.name !== undefined) row.name = payload.name;
  if (payload.institutionType !== undefined) row.institution_type = payload.institutionType;
  if (payload.description !== undefined) {
    row.description = payload.description;
    row.short_description = shortText(payload.description, 180);
  }
  if (payload.city !== undefined) row.city = payload.city;
  if (payload.address !== undefined) row.address = payload.address;
  if (payload.phone !== undefined) row.phone = payload.phone;
  if (payload.email !== undefined) row.email = payload.email;
  if (payload.website !== undefined) row.website = payload.website;
  if (payload.mapUrl !== undefined) row.map_url = payload.mapUrl;
  if (payload.status !== undefined) {
    row.status = payload.status;
    await syncProviderUserOnStatus(row.user_id, payload.status);
  }

  await row.save();
  return adminGetPrivateInstitutionById(id);
}

async function adminListTrainingCenters(query) {
  const { page, limit, offset } = parsePagination(query);
  const where = {};
  if (query.status) where.status = query.status;
  if (query.search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${query.search}%` } },
      { city: { [Op.like]: `%${query.search}%` } },
      { email: { [Op.like]: `%${query.search}%` } },
    ];
  }

  const { rows, count } = await TrainingCenter.findAndCountAll({
    where,
    include: [{ model: User, as: 'owner', attributes: ['id', 'email'] }],
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  return buildPaginatedResponse({
    rows: rows.map(formatAdminTrainingCenterListRow),
    count,
    page,
    limit,
  });
}

async function adminUpdateTrainingCenterStatus(id, status) {
  const center = await TrainingCenter.findByPk(id);
  if (!center) throw ApiError.notFound('Centre introuvable');
  center.status = status;
  await center.save();
  await syncProviderUserOnStatus(center.user_id, status);
  return { id: center.id, status: center.status };
}

async function adminListPrivateInstitutions(query) {
  const { page, limit, offset } = parsePagination(query);
  const where = {};
  if (query.status) where.status = query.status;
  if (query.search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${query.search}%` } },
      { city: { [Op.like]: `%${query.search}%` } },
      { email: { [Op.like]: `%${query.search}%` } },
    ];
  }

  const { rows, count } = await PrivateInstitution.findAndCountAll({
    where,
    include: [{ model: User, as: 'owner', attributes: ['id', 'email'] }],
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  return buildPaginatedResponse({
    rows: rows.map(formatAdminInstitutionListRow),
    count,
    page,
    limit,
  });
}

async function adminUpdatePrivateInstitutionStatus(id, status) {
  const row = await PrivateInstitution.findByPk(id);
  if (!row) throw ApiError.notFound('Établissement introuvable');
  row.status = status;
  await row.save();
  await syncProviderUserOnStatus(row.user_id, status);
  return { id: row.id, status: row.status };
}

async function adminListInstitutionOfferings(query = {}) {
  const { page, limit, offset } = parsePagination(query);
  const where = { offering_type: { [Op.ne]: 'opportunity' } };
  const institutionWhere = {};
  if (query.status) where.status = query.status;
  if (query.type) where.offering_type = query.type;
  if (query.search) {
    where[Op.or] = [
      { title: { [Op.like]: `%${query.search}%` } },
      { summary: { [Op.like]: `%${query.search}%` } },
      { category: { [Op.like]: `%${query.search}%` } },
    ];
  }
  if (query.institutionSearch) {
    institutionWhere.name = { [Op.like]: `%${query.institutionSearch}%` };
  }

  const { rows, count } = await InstitutionOffering.findAndCountAll({
    where,
    include: [
      {
        model: PrivateInstitution,
        as: 'institution',
        attributes: ['id', 'name', 'status'],
        where: institutionWhere,
        required: Boolean(query.institutionSearch),
      },
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  return buildPaginatedResponse({
    rows: rows.map((row) => ({
      ...formatInstitutionOffering(row),
      institution: row.institution
        ? {
            id: row.institution.id,
            name: row.institution.name,
            status: row.institution.status,
          }
        : null,
    })),
    count,
    page,
    limit,
  });
}

async function adminUpdateInstitutionOfferingStatus(id, status, adminNote = null) {
  const row = await InstitutionOffering.findByPk(id, {
    include: [{ model: PrivateInstitution, as: 'institution' }],
  });
  if (!row) throw ApiError.notFound('Publication établissement introuvable');
  if (row.offering_type === 'opportunity') {
    throw ApiError.badRequest('Ce type de publication n’est plus supporté.');
  }
  if (
    status === CATALOG_PUBLISH_STATUS.PUBLISHED &&
    (!row.institution ||
      row.institution.status !== CATALOG_PUBLISH_STATUS.PUBLISHED ||
      !isProfileComplete(row.institution))
  ) {
    throw ApiError.badRequest(
      'L’établissement doit être publié avec un profil complet avant de publier ce contenu.'
    );
  }
  row.status = status;
  row.admin_note = adminNote ?? null;
  await row.save();
  return formatInstitutionOffering(row);
}

module.exports = {
  formatTrainingCenterDetail,
  formatInstitutionDetail,
  listTrainingCenters,
  getTrainingCenterById,
  listPrivateInstitutions,
  getPrivateInstitutionById,
  listPublishedInstitutionOfferingsForInstitution,
  getPublishedInstitutionOfferingById,
  getPublishedInstitutionOfferingPreviewById,
  participateInstitutionOffering,
  submitPrivateInstitution,
  adminListTrainingCenters,
  adminGetTrainingCenterById,
  adminCreateTrainingCenter,
  adminUpdateTrainingCenter,
  adminUpdateTrainingCenterStatus,
  adminListPrivateInstitutions,
  adminListInstitutionOfferings,
  adminGetPrivateInstitutionById,
  adminCreatePrivateInstitution,
  adminUpdatePrivateInstitution,
  adminUpdatePrivateInstitutionStatus,
  adminUpdateInstitutionOfferingStatus,
};
