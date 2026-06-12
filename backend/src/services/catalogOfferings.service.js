'use strict';

const { Op } = require('sequelize');
const sequelize = require('../database/sequelize');
const {
  TrainingCenter,
  TrainingFormation,
  TrainingEvent,
  FormationParticipation,
  EventParticipation,
} = require('../models');
const {
  CATALOG_PUBLISH_STATUS,
  CATALOG_PUBLIC_STATUSES,
  USER_ROLES,
  PARTICIPATION_TYPES,
} = require('../config/constants');
const ApiError = require('../utils/ApiError');
const { generateUuid } = require('../utils/uuid');
const { parsePagination, buildPaginatedResponse } = require('../utils/pagination');
const { buildCatalogImagePublicUrl } = require('../utils/fileStorage');
const {
  getTrainingCenterForUser,
  isProfileComplete,
} = require('../utils/catalogProviderAccess.util');
const {
  formatFormation,
  formatEvent,
} = require('../utils/catalogOfferingFormat.util');
const catalogParticipationsService = require('./catalogParticipations.service');
const logger = require('../utils/logger');

async function assertCanPublishOfferings(userId) {
  const center = await getTrainingCenterForUser(userId);
  if (center.status !== CATALOG_PUBLISH_STATUS.PUBLISHED) {
    throw ApiError.forbidden(
      'Votre compte doit être validé par un administrateur avant de publier des formations ou événements.'
    );
  }
  if (!isProfileComplete(center, 'training')) {
    throw ApiError.forbidden('Complétez votre profil (logo, description, ville) avant de publier.');
  }
  return center;
}

async function getCenterForOfferingStatus(userId, status) {
  if (status === CATALOG_PUBLISH_STATUS.PENDING) {
    return assertCanPublishOfferings(userId);
  }
  return getTrainingCenterForUser(userId);
}

function requestedProviderStatus(payload, fallback = CATALOG_PUBLISH_STATUS.PENDING) {
  return payload.status === CATALOG_PUBLISH_STATUS.DRAFT
    ? CATALOG_PUBLISH_STATUS.DRAFT
    : fallback;
}

function mapFormationPayload(payload) {
  return {
    title: payload.title,
    category: payload.category ?? null,
    short_description: payload.shortDescription ?? null,
    description: payload.description ?? null,
    start_date: payload.startDate ?? null,
    end_date: payload.endDate ?? null,
    duration_label: payload.durationLabel ?? null,
    city: payload.city ?? null,
    address: payload.address ?? null,
    delivery_mode: payload.deliveryMode ?? null,
    price: payload.price ?? null,
    certificate_delivered: payload.certificateDelivered ?? false,
    seats: payload.seats ?? null,
    main_image_url: payload.mainImageUrl ?? null,
    gallery_json: payload.gallery ?? [],
    phone: payload.phone ?? null,
    email: payload.email ?? null,
    website: payload.website ?? null,
  };
}

function mapEventPayload(payload) {
  return {
    title: payload.title,
    event_type: payload.eventType,
    description: payload.description ?? null,
    event_date: payload.eventDate ?? null,
    start_time: payload.startTime ?? null,
    end_time: payload.endTime ?? null,
    city: payload.city ?? null,
    address: payload.address ?? null,
    price: payload.price ?? null,
    seats: payload.seats ?? null,
    poster_image_url: payload.posterImageUrl ?? null,
    gallery_json: payload.gallery ?? [],
    phone: payload.phone ?? null,
    email: payload.email ?? null,
    website: payload.website ?? null,
  };
}

function uploadImageUrl(file) {
  return buildCatalogImagePublicUrl(file.filename);
}

// ——— Provider ———

function hasPaginationQuery(query = {}) {
  return query.page !== undefined || query.limit !== undefined;
}

function offeringSearchWhere(search, fields) {
  const q = typeof search === 'string' ? search.trim() : '';
  if (!q) return {};
  return {
    [Op.or]: fields.map((field) => ({
      [field]: { [Op.like]: `%${q}%` },
    })),
  };
}

async function listProviderFormations(userId, query = {}) {
  const center = await getTrainingCenterForUser(userId);
  const where = {
    center_id: center.id,
    ...offeringSearchWhere(query.search, ['title', 'category', 'city']),
  };
  if (query.status) where.status = query.status;

  const options = {
    where,
    order: [['created_at', 'DESC']],
  };
  if (hasPaginationQuery(query)) {
    const { page, limit, offset } = parsePagination(query);
    const { rows, count } = await TrainingFormation.findAndCountAll({
      ...options,
      limit,
      offset,
    });
    const countMap = await catalogParticipationsService.countRegisteredByFormationIds(
      rows.map((r) => r.id)
    );
    return buildPaginatedResponse({
      rows: rows.map((r) =>
        formatFormation(r, {
          participantsCount: countMap.get(r.id) ?? 0,
        })
      ),
      count,
      page,
      limit,
    });
  }

  const rows = await TrainingFormation.findAll(options);
  const countMap = await catalogParticipationsService.countRegisteredByFormationIds(
    rows.map((r) => r.id)
  );
  return rows.map((r) =>
    formatFormation(r, {
      participantsCount: countMap.get(r.id) ?? 0,
    })
  );
}

async function getProviderFormation(userId, formationId) {
  const center = await getTrainingCenterForUser(userId);
  const row = await TrainingFormation.findOne({
    where: { id: formationId, center_id: center.id },
  });
  if (!row) throw ApiError.notFound('Formation introuvable');

  const { items } = await catalogParticipationsService.listProviderParticipations(userId, {
    offeringKind: 'formation',
    offeringId: formationId,
    participationType: PARTICIPATION_TYPES.REGISTERED,
  });

  const registeredParticipants = items;
  return {
    ...formatFormation(row),
    participantsCount: items.length,
    registeredCount: registeredParticipants.length,
    participants: items,
    registeredParticipants,
  };
}

async function createProviderFormation(userId, payload) {
  const status = requestedProviderStatus(payload);
  const center = await getCenterForOfferingStatus(userId, status);
  const row = await TrainingFormation.create({
    id: generateUuid(),
    center_id: center.id,
    ...mapFormationPayload(payload),
    status,
    created_at: new Date(),
    updated_at: new Date(),
  });
  return formatFormation(row);
}

async function updateProviderFormation(userId, formationId, payload) {
  const center = await getTrainingCenterForUser(userId);
  const row = await TrainingFormation.findOne({
    where: { id: formationId, center_id: center.id },
  });
  if (!row) throw ApiError.notFound('Formation introuvable');

  const nextStatus = requestedProviderStatus(payload, row.status);
  if (nextStatus === CATALOG_PUBLISH_STATUS.PENDING) {
    await assertCanPublishOfferings(userId);
  }
  const mapped = mapFormationPayload({ ...formatFormation(row), ...payload });
  Object.assign(row, mapped);
  if (payload.status !== undefined) {
    row.status = nextStatus;
  } else if (
    row.status === CATALOG_PUBLISH_STATUS.REJECTED ||
    row.status === CATALOG_PUBLISH_STATUS.PUBLISHED
  ) {
    row.status = CATALOG_PUBLISH_STATUS.PENDING;
  }
  if (row.status === CATALOG_PUBLISH_STATUS.PENDING) {
    row.admin_note = null;
  }
  await row.save();
  return formatFormation(row);
}

async function deleteProviderFormation(userId, formationId) {
  const center = await getTrainingCenterForUser(userId);
  const deleted = await TrainingFormation.destroy({
    where: { id: formationId, center_id: center.id },
  });
  if (!deleted) throw ApiError.notFound('Formation introuvable');
  return { success: true };
}

async function listProviderEvents(userId, query = {}) {
  const center = await getTrainingCenterForUser(userId);
  const where = {
    center_id: center.id,
    ...offeringSearchWhere(query.search, ['title', 'city', 'event_type']),
  };
  if (query.status) where.status = query.status;

  const options = {
    where,
    order: [['created_at', 'DESC']],
  };
  if (hasPaginationQuery(query)) {
    const { page, limit, offset } = parsePagination(query);
    const { rows, count } = await TrainingEvent.findAndCountAll({
      ...options,
      limit,
      offset,
    });
    const countMap = await catalogParticipationsService.countRegisteredByEventIds(
      rows.map((r) => r.id)
    );
    return buildPaginatedResponse({
      rows: rows.map((r) =>
        formatEvent(r, {
          participantsCount: countMap.get(r.id) ?? 0,
        })
      ),
      count,
      page,
      limit,
    });
  }

  const rows = await TrainingEvent.findAll(options);
  const countMap = await catalogParticipationsService.countRegisteredByEventIds(
    rows.map((r) => r.id)
  );
  return rows.map((r) =>
    formatEvent(r, {
      participantsCount: countMap.get(r.id) ?? 0,
    })
  );
}

async function getProviderEvent(userId, eventId) {
  const center = await getTrainingCenterForUser(userId);
  const row = await TrainingEvent.findOne({
    where: { id: eventId, center_id: center.id },
  });
  if (!row) throw ApiError.notFound('Événement introuvable');

  const { items } = await catalogParticipationsService.listProviderParticipations(userId, {
    offeringKind: 'event',
    offeringId: eventId,
    participationType: PARTICIPATION_TYPES.REGISTERED,
  });

  return {
    ...formatEvent(row),
    participantsCount: items.length,
    registeredCount: items.length,
    participants: items,
    registeredParticipants: items,
  };
}

async function createProviderEvent(userId, payload) {
  const status = requestedProviderStatus(payload);
  const center = await getCenterForOfferingStatus(userId, status);
  const row = await TrainingEvent.create({
    id: generateUuid(),
    center_id: center.id,
    ...mapEventPayload(payload),
    status,
    created_at: new Date(),
    updated_at: new Date(),
  });
  return formatEvent(row);
}

async function updateProviderEvent(userId, eventId, payload) {
  const center = await getTrainingCenterForUser(userId);
  const row = await TrainingEvent.findOne({
    where: { id: eventId, center_id: center.id },
  });
  if (!row) throw ApiError.notFound('Événement introuvable');

  const nextStatus = requestedProviderStatus(payload, row.status);
  if (nextStatus === CATALOG_PUBLISH_STATUS.PENDING) {
    await assertCanPublishOfferings(userId);
  }
  const mapped = mapEventPayload({ ...formatEvent(row), ...payload });
  Object.assign(row, mapped);
  if (payload.status !== undefined) {
    row.status = nextStatus;
  } else if (
    row.status === CATALOG_PUBLISH_STATUS.REJECTED ||
    row.status === CATALOG_PUBLISH_STATUS.PUBLISHED
  ) {
    row.status = CATALOG_PUBLISH_STATUS.PENDING;
  }
  if (row.status === CATALOG_PUBLISH_STATUS.PENDING) {
    row.admin_note = null;
  }
  await row.save();
  return formatEvent(row);
}

async function deleteProviderEvent(userId, eventId) {
  const center = await getTrainingCenterForUser(userId);
  const deleted = await TrainingEvent.destroy({
    where: { id: eventId, center_id: center.id },
  });
  if (!deleted) throw ApiError.notFound('Événement introuvable');
  return { success: true };
}

async function uploadCatalogImages(files) {
  return files.map((f) => uploadImageUrl(f));
}

// ——— Public ———

async function getPublishedFormationById(id, userId = null) {
  const row = await TrainingFormation.findOne({
    where: { id, status: CATALOG_PUBLISH_STATUS.PUBLISHED },
    include: [
      {
        model: TrainingCenter,
        as: 'center',
        attributes: ['id', 'name', 'logo_url', 'website', 'city', 'status'],
      },
    ],
  });
  if (!row || !row.center || row.center.status !== CATALOG_PUBLISH_STATUS.PUBLISHED) {
    throw ApiError.notFound('Formation introuvable');
  }
  let participationType = null;
  if (userId) {
    const p = await FormationParticipation.findOne({
      where: { formation_id: id, user_id: userId },
    });
    participationType = p?.participation_type ?? null;
  }
  const registeredCount = await catalogParticipationsService.countRegisteredForFormation(id);
  const participantsCount = catalogParticipationsService.publicParticipantsCount(
    registeredCount,
    row.seats
  );
  return formatFormation(row, {
    center: row.center,
    participationType,
    participantsCount,
  });
}

async function getPublishedEventById(id, userId = null) {
  const row = await TrainingEvent.findOne({
    where: { id, status: CATALOG_PUBLISH_STATUS.PUBLISHED },
    include: [
      {
        model: TrainingCenter,
        as: 'center',
        attributes: ['id', 'name', 'logo_url', 'website', 'city', 'status'],
      },
    ],
  });
  if (!row || !row.center || row.center.status !== CATALOG_PUBLISH_STATUS.PUBLISHED) {
    throw ApiError.notFound('Événement introuvable');
  }
  let participationType = null;
  if (userId) {
    const p = await EventParticipation.findOne({
      where: { event_id: id, user_id: userId },
    });
    participationType = p?.participation_type ?? null;
  }
  const registeredCount = await catalogParticipationsService.countRegisteredForEvent(id);
  const participantsCount = catalogParticipationsService.publicParticipantsCount(
    registeredCount,
    row.seats
  );
  return formatEvent(row, {
    center: row.center,
    participationType,
    participantsCount,
  });
}

async function listPublishedFormationsForCenter(centerId, query = {}) {
  const center = await TrainingCenter.findOne({
    where: { id: centerId, status: { [Op.in]: [...CATALOG_PUBLIC_STATUSES] } },
  });
  if (!center) throw ApiError.notFound('Centre introuvable');

  const where = {
    center_id: centerId,
    status: CATALOG_PUBLISH_STATUS.PUBLISHED,
    ...offeringSearchWhere(query.search, ['title', 'category', 'city']),
  };
  const options = {
    where,
    order: [['start_date', 'ASC'], ['created_at', 'DESC']],
  };

  if (hasPaginationQuery(query)) {
    const { page, limit, offset } = parsePagination(query);
    const { rows, count } = await TrainingFormation.findAndCountAll({
      ...options,
      limit,
      offset,
    });
    const countMap = await catalogParticipationsService.countRegisteredByFormationIds(
      rows.map((r) => r.id)
    );
    return buildPaginatedResponse({
      rows: rows.map((r) => {
        const registered = countMap.get(r.id) ?? 0;
        return formatFormation(r, {
          centerName: center.name,
          participantsCount: catalogParticipationsService.publicParticipantsCount(
            registered,
            r.seats
          ),
        });
      }),
      count,
      page,
      limit,
    });
  }

  const rows = await TrainingFormation.findAll(options);
  const countMap = await catalogParticipationsService.countRegisteredByFormationIds(
    rows.map((r) => r.id)
  );
  return rows.map((r) => {
    const registered = countMap.get(r.id) ?? 0;
    return formatFormation(r, {
      centerName: center.name,
      participantsCount: catalogParticipationsService.publicParticipantsCount(
        registered,
        r.seats
      ),
    });
  });
}

async function listPublishedEventsForCenter(centerId, query = {}) {
  const center = await TrainingCenter.findOne({
    where: { id: centerId, status: { [Op.in]: [...CATALOG_PUBLIC_STATUSES] } },
  });
  if (!center) throw ApiError.notFound('Centre introuvable');

  const where = {
    center_id: centerId,
    status: CATALOG_PUBLISH_STATUS.PUBLISHED,
    ...offeringSearchWhere(query.search, ['title', 'event_type', 'city']),
  };
  const options = {
    where,
    order: [['event_date', 'ASC'], ['created_at', 'DESC']],
  };

  if (hasPaginationQuery(query)) {
    const { page, limit, offset } = parsePagination(query);
    const { rows, count } = await TrainingEvent.findAndCountAll({
      ...options,
      limit,
      offset,
    });
    const countMap = await catalogParticipationsService.countRegisteredByEventIds(
      rows.map((r) => r.id)
    );
    return buildPaginatedResponse({
      rows: rows.map((r) => {
        const registered = countMap.get(r.id) ?? 0;
        return formatEvent(r, {
          centerName: center.name,
          participantsCount: catalogParticipationsService.publicParticipantsCount(
            registered,
            r.seats
          ),
        });
      }),
      count,
      page,
      limit,
    });
  }

  const rows = await TrainingEvent.findAll(options);
  const countMap = await catalogParticipationsService.countRegisteredByEventIds(
    rows.map((r) => r.id)
  );
  return rows.map((r) => {
    const registered = countMap.get(r.id) ?? 0;
    return formatEvent(r, {
      centerName: center.name,
      participantsCount: catalogParticipationsService.publicParticipantsCount(
        registered,
        r.seats
      ),
    });
  });
}

function assertCandidateUser(user) {
  if (!user) throw ApiError.unauthorized('Connexion requise');
  if (user.role !== USER_ROLES.CANDIDATE) {
    throw ApiError.forbidden('Seuls les candidats connectés peuvent s’inscrire ou manifester leur intérêt');
  }
}

async function participateFormation(formationId, user, participationType) {
  assertCandidateUser(user);

  await sequelize.transaction(async (transaction) => {
    const formation = await TrainingFormation.findOne({
      where: { id: formationId, status: CATALOG_PUBLISH_STATUS.PUBLISHED },
      include: [
        {
          model: TrainingCenter,
          as: 'center',
          attributes: ['id', 'status'],
        },
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!formation || formation.center?.status !== CATALOG_PUBLISH_STATUS.PUBLISHED) {
      throw ApiError.notFound('Formation introuvable');
    }

    const existing = await FormationParticipation.findOne({
      where: { formation_id: formationId, user_id: user.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (existing) {
      throw ApiError.conflict(
        'Vous êtes déjà inscrit(e) à cette formation. Une seule inscription est autorisée.'
      );
    }

    if (participationType === PARTICIPATION_TYPES.REGISTERED && formation.seats > 0) {
      const registeredCount = await FormationParticipation.count({
        where: {
          formation_id: formationId,
          participation_type: PARTICIPATION_TYPES.REGISTERED,
        },
        transaction,
      });
      if (registeredCount >= formation.seats) {
        throw ApiError.conflict('Plus de places disponibles pour cette formation.');
      }
    }

    await FormationParticipation.create(
      {
        id: generateUuid(),
        formation_id: formationId,
        user_id: user.id,
        participation_type: participationType,
        created_at: new Date(),
      },
      { transaction }
    );
  });

  catalogParticipationsService
    .notifyFormationParticipation(formationId, user, participationType)
    .catch((err) => logger.error('[Participation] Notification formation', err));
  return { participationType, updated: false };
}

async function participateEvent(eventId, user, participationType) {
  assertCandidateUser(user);

  await sequelize.transaction(async (transaction) => {
    const event = await TrainingEvent.findOne({
      where: { id: eventId, status: CATALOG_PUBLISH_STATUS.PUBLISHED },
      include: [
        {
          model: TrainingCenter,
          as: 'center',
          attributes: ['id', 'status'],
        },
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!event || event.center?.status !== CATALOG_PUBLISH_STATUS.PUBLISHED) {
      throw ApiError.notFound('Événement introuvable');
    }

    const existing = await EventParticipation.findOne({
      where: { event_id: eventId, user_id: user.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (existing) {
      throw ApiError.conflict(
        'Vous êtes déjà inscrit(e) à cet événement. Une seule inscription est autorisée.'
      );
    }

    if (participationType === PARTICIPATION_TYPES.REGISTERED && event.seats > 0) {
      const registeredCount = await EventParticipation.count({
        where: {
          event_id: eventId,
          participation_type: PARTICIPATION_TYPES.REGISTERED,
        },
        transaction,
      });
      if (registeredCount >= event.seats) {
        throw ApiError.conflict('Plus de places disponibles pour cet événement.');
      }
    }

    await EventParticipation.create(
      {
        id: generateUuid(),
        event_id: eventId,
        user_id: user.id,
        participation_type: participationType,
        created_at: new Date(),
      },
      { transaction }
    );
  });

  catalogParticipationsService
    .notifyEventParticipation(eventId, user, participationType)
    .catch((err) => logger.error('[Participation] Notification événement', err));
  return { participationType, updated: false };
}

// ——— Admin ———

async function adminListFormations(query) {
  const { page, limit, offset } = parsePagination(query);
  const where = offeringSearchWhere(query.search, ['title', 'category', 'city', '$center.name$']);
  if (query.status) where.status = query.status;

  const { rows, count } = await TrainingFormation.findAndCountAll({
    where,
    include: [
      {
        model: TrainingCenter,
        as: 'center',
        attributes: ['id', 'name', 'city'],
      },
    ],
    subQuery: false,
    distinct: true,
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  const items = rows.map((r) => formatFormation(r, { center: r.center }));
  return buildPaginatedResponse({ rows: items, count, page, limit });
}

async function adminListEvents(query) {
  const { page, limit, offset } = parsePagination(query);
  const where = offeringSearchWhere(query.search, ['title', 'event_type', 'city', '$center.name$']);
  if (query.status) where.status = query.status;

  const { rows, count } = await TrainingEvent.findAndCountAll({
    where,
    include: [
      {
        model: TrainingCenter,
        as: 'center',
        attributes: ['id', 'name', 'city'],
      },
    ],
    subQuery: false,
    distinct: true,
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  const items = rows.map((r) => formatEvent(r, { center: r.center }));
  return buildPaginatedResponse({ rows: items, count, page, limit });
}

async function adminSetFormationStatus(id, status, adminNote) {
  const row = await TrainingFormation.findByPk(id);
  if (!row) throw ApiError.notFound('Formation introuvable');
  row.status = status;
  row.admin_note = adminNote ?? null;
  await row.save();
  return formatFormation(row);
}

async function adminSetEventStatus(id, status, adminNote) {
  const row = await TrainingEvent.findByPk(id);
  if (!row) throw ApiError.notFound('Événement introuvable');
  row.status = status;
  row.admin_note = adminNote ?? null;
  await row.save();
  return formatEvent(row);
}

module.exports = {
  formatFormation,
  formatEvent,
  listProviderFormations,
  getProviderFormation,
  createProviderFormation,
  updateProviderFormation,
  deleteProviderFormation,
  listProviderEvents,
  getProviderEvent,
  createProviderEvent,
  updateProviderEvent,
  deleteProviderEvent,
  uploadCatalogImages,
  uploadImageUrl,
  getPublishedFormationById,
  getPublishedEventById,
  listPublishedFormationsForCenter,
  listPublishedEventsForCenter,
  participateFormation,
  participateEvent,
  adminListFormations,
  adminListEvents,
  adminSetFormationStatus,
  adminSetEventStatus,
  PARTICIPATION_TYPES,
};
