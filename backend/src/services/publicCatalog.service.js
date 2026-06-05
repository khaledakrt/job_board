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
} = require('../models');
const { formatFormation, formatEvent } = require('../utils/catalogOfferingFormat.util');
const catalogParticipationsService = require('./catalogParticipations.service');
const {
  CATALOG_PUBLISH_STATUS,
  CATALOG_PUBLIC_STATUSES,
} = require('../config/constants');
const ApiError = require('../utils/ApiError');
const { generateUuid } = require('../utils/uuid');
const { parsePagination, buildPaginatedResponse } = require('../utils/pagination');
const { parseJsonArray, shortText } = require('../utils/catalogJson');

function formatSocialLinks(raw) {
  return parseJsonArray(raw).filter((item) => item && item.url);
}

function formatPhotos(raw) {
  return parseJsonArray(raw).filter((url) => typeof url === 'string' && url.trim());
}

function formatTrainingCenterCard(center, courseCount = 0) {
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
  };
}

function formatTrainingCenterDetail(center, courses, formations = [], events = [], countMaps = {}) {
  const formationCounts = countMaps.formationCounts ?? new Map();
  const eventCounts = countMaps.eventCounts ?? new Map();

  return {
    ...formatTrainingCenterCard(center, courses.length),
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
        participantsCount: catalogParticipationsService.publicParticipantsCount(
          formationCounts.get(f.id) ?? 0,
          f.seats
        ),
      })
    ),
    events: events.map((e) =>
      formatEvent(e, {
        centerName: center.name,
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function attachInstitutionOfferings(detail, offerings) {
  const formatted = offerings.map(formatInstitutionOffering);
  return {
    ...detail,
    institutionOfferings: formatted,
    publishedPrograms: formatted.filter((o) => o.offeringType === 'program'),
    publishedEvents: formatted.filter((o) => o.offeringType === 'event'),
    publishedAnnouncements: formatted.filter((o) => o.offeringType === 'announcement'),
    publishedOpportunities: formatted.filter((o) => o.offeringType === 'opportunity'),
  };
}

async function getPublishedInstitutionOfferingById(id) {
  const row = await InstitutionOffering.findOne({
    where: { id, status: CATALOG_PUBLISH_STATUS.PUBLISHED },
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
  if (ids.length) {
    const grouped = await TrainingCourse.findAll({
      attributes: ['center_id', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']],
      where: { center_id: { [Op.in]: ids } },
      group: ['center_id'],
      raw: true,
    });
    grouped.forEach((g) => {
      courseCounts[g.center_id] = Number(g.cnt) || 0;
    });
  }

  const items = rows.map((row) =>
    formatTrainingCenterCard(row, courseCounts[row.id] || 0)
  );

  return buildPaginatedResponse({ rows: items, count, page, limit });
}

async function getTrainingCenterById(id) {
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

  const [formationCounts, eventCounts] = await Promise.all([
    catalogParticipationsService.countRegisteredByFormationIds(formations.map((f) => f.id)),
    catalogParticipationsService.countRegisteredByEventIds(events.map((e) => e.id)),
  ]);

  return formatTrainingCenterDetail(center, center.courses || [], formations, events, {
    formationCounts,
    eventCounts,
  });
}

async function submitTrainingCenter(payload) {
  const id = generateUuid();
  const shortDescription = shortText(payload.description, 200);

  return sequelize.transaction(async (transaction) => {
    await TrainingCenter.create(
      {
        id,
        name: payload.name,
        logo_url: payload.logoUrl ?? null,
        description: payload.description,
        short_description: shortDescription,
        city: payload.city ?? null,
        address: payload.address ?? null,
        phone: payload.phone ?? null,
        email: payload.email ?? null,
        website: payload.website ?? null,
        training_domain: payload.trainingDomain ?? null,
        delivery_mode: payload.deliveryMode ?? null,
        photos_json: payload.photoUrls ?? [],
        social_links_json: payload.socialLinks ?? [],
        status: CATALOG_PUBLISH_STATUS.PENDING,
      },
      { transaction }
    );

    for (const course of payload.courses) {
      await TrainingCourse.create(
        {
          id: generateUuid(),
          center_id: id,
          title: course.title,
          description: course.description ?? null,
          delivery_mode: course.deliveryMode ?? payload.deliveryMode ?? null,
        },
        { transaction }
      );
    }

    return {
      id,
      status: CATALOG_PUBLISH_STATUS.PENDING,
      message:
        'Votre centre a été envoyé. Il sera visible après validation par un administrateur.',
    };
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

async function getPrivateInstitutionById(id) {
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
    },
    order: [['start_date', 'ASC'], ['created_at', 'DESC']],
  });
  return attachInstitutionOfferings(formatInstitutionDetail(row), offerings);
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
    where: { institution_id: id },
    order: [['created_at', 'DESC']],
  });
  const detail = attachInstitutionOfferings(formatInstitutionDetail(row), offerings);
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
  const where = {};
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
  const row = await InstitutionOffering.findByPk(id);
  if (!row) throw ApiError.notFound('Publication établissement introuvable');
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
  submitTrainingCenter,
  listPrivateInstitutions,
  getPrivateInstitutionById,
  getPublishedInstitutionOfferingById,
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
