'use strict';

const { Op } = require('sequelize');
const { InstitutionOffering, InstitutionParticipation } = require('../models');
const ApiError = require('../utils/ApiError');
const { generateUuid } = require('../utils/uuid');
const { getInstitutionForUser, isProfileComplete } = require('../utils/catalogProviderAccess.util');
const { CATALOG_PUBLISH_STATUS } = require('../config/constants');
const { parseJsonArray } = require('../utils/catalogJson');
const { parsePagination, buildPaginatedResponse } = require('../utils/pagination');

function formatOffering(row, opts = {}) {
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
    registrationsCount: opts.registrationsCount ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPayload(type, payload) {
  return {
    offering_type: type,
    title: payload.title,
    summary: payload.summary ?? null,
    description: payload.description ?? null,
    category: payload.category ?? null,
    event_type: type === 'event' ? payload.eventType ?? null : null,
    opportunity_type: type === 'opportunity' ? payload.opportunityType ?? null : null,
    start_date: payload.startDate ?? null,
    end_date: payload.endDate ?? null,
    start_time: payload.startTime ?? null,
    end_time: payload.endTime ?? null,
    city: payload.city ?? null,
    address: payload.address ?? null,
    price: payload.price ?? null,
    seats: payload.seats ?? null,
    main_image_url: payload.mainImageUrl ?? null,
    gallery_json: payload.gallery ?? [],
    phone: payload.phone ?? null,
    email: payload.email ?? null,
    website: payload.website ?? null,
    status: payload.status ?? 'draft',
  };
}

function hasPaginationQuery(query = {}) {
  return query.page !== undefined || query.limit !== undefined;
}

function assertTypePayload(type, payload) {
  if (type === 'event' && !payload.eventType) {
    throw ApiError.badRequest('Le type d’événement est obligatoire.');
  }
  if (type === 'opportunity' && !payload.opportunityType) {
    throw ApiError.badRequest('Le type d’opportunité est obligatoire.');
  }
}

async function assertCanSubmit(institution, status) {
  if (status !== 'pending') return;
  if (institution.status !== CATALOG_PUBLISH_STATUS.PUBLISHED) {
    throw ApiError.forbidden(
      'Votre compte doit être validé par un administrateur avant de soumettre ce contenu.'
    );
  }
  if (!isProfileComplete(institution)) {
    throw ApiError.forbidden('Complétez votre profil (logo, description, ville) avant de publier.');
  }
}

async function countRegistrations(ids) {
  const map = new Map();
  if (!ids.length) return map;
  const rows = await InstitutionParticipation.findAll({
    where: { offering_id: { [Op.in]: ids }, participation_type: 'registered' },
    attributes: ['offering_id'],
  });
  rows.forEach((r) => map.set(r.offering_id, (map.get(r.offering_id) || 0) + 1));
  return map;
}

async function listProviderOfferings(userId, query = {}) {
  const institution = await getInstitutionForUser(userId);
  const where = {
    institution_id: institution.id,
    offering_type: { [Op.ne]: 'opportunity' },
  };
  if (query.type) where.offering_type = query.type;
  if (query.status) where.status = query.status;
  if (query.search) {
    where[Op.or] = [
      { title: { [Op.like]: `%${query.search}%` } },
      { summary: { [Op.like]: `%${query.search}%` } },
      { category: { [Op.like]: `%${query.search}%` } },
      { city: { [Op.like]: `%${query.search}%` } },
    ];
  }

  if (hasPaginationQuery(query)) {
    const { page, limit, offset } = parsePagination(query);
    const { rows, count } = await InstitutionOffering.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });
    const counts = await countRegistrations(rows.map((r) => r.id));
    return buildPaginatedResponse({
      rows: rows.map((r) => formatOffering(r, { registrationsCount: counts.get(r.id) ?? 0 })),
      count,
      page,
      limit,
    });
  }

  const rows = await InstitutionOffering.findAll({
    where,
    order: [['created_at', 'DESC']],
  });
  const counts = await countRegistrations(rows.map((r) => r.id));
  return rows.map((r) => formatOffering(r, { registrationsCount: counts.get(r.id) ?? 0 }));
}

async function getProviderOffering(userId, id) {
  const institution = await getInstitutionForUser(userId);
  const row = await InstitutionOffering.findOne({
    where: {
      id,
      institution_id: institution.id,
      offering_type: { [Op.ne]: 'opportunity' },
    },
  });
  if (!row) throw ApiError.notFound('Contenu introuvable');
  const counts = await countRegistrations([row.id]);
  return formatOffering(row, { registrationsCount: counts.get(row.id) ?? 0 });
}

async function createProviderOffering(userId, type, payload) {
  const institution = await getInstitutionForUser(userId);
  assertTypePayload(type, payload);
  await assertCanSubmit(institution, payload.status ?? 'draft');
  const row = await InstitutionOffering.create({
    id: generateUuid(),
    institution_id: institution.id,
    ...mapPayload(type, payload),
    created_at: new Date(),
    updated_at: new Date(),
  });
  return formatOffering(row);
}

async function updateProviderOffering(userId, id, payload) {
  const institution = await getInstitutionForUser(userId);
  const row = await InstitutionOffering.findOne({
    where: {
      id,
      institution_id: institution.id,
      offering_type: { [Op.ne]: 'opportunity' },
    },
  });
  if (!row) throw ApiError.notFound('Contenu introuvable');

  const nextStatus =
    payload.status !== undefined
      ? payload.status
      : row.status === CATALOG_PUBLISH_STATUS.PUBLISHED ||
          row.status === CATALOG_PUBLISH_STATUS.REJECTED
        ? CATALOG_PUBLISH_STATUS.PENDING
        : row.status;
  assertTypePayload(row.offering_type, { ...formatOffering(row), ...payload });
  await assertCanSubmit(institution, nextStatus);
  const mapped = mapPayload(row.offering_type, { ...formatOffering(row), ...payload });
  Object.assign(row, mapped);
  row.status = nextStatus;
  if (row.status !== 'rejected') {
    row.admin_note = null;
  }
  await row.save();
  return getProviderOffering(userId, id);
}

async function deleteProviderOffering(userId, id) {
  const institution = await getInstitutionForUser(userId);
  const deleted = await InstitutionOffering.destroy({
    where: {
      id,
      institution_id: institution.id,
      offering_type: { [Op.ne]: 'opportunity' },
    },
  });
  if (!deleted) throw ApiError.notFound('Contenu introuvable');
  return { success: true };
}

async function providerStats(userId) {
  const institution = await getInstitutionForUser(userId);
  const rows = await InstitutionOffering.findAll({
    where: {
      institution_id: institution.id,
      offering_type: { [Op.ne]: 'opportunity' },
    },
    attributes: ['id', 'offering_type', 'status', 'views_count', 'clicks_count'],
  });
  const counts = await countRegistrations(rows.map((r) => r.id));
  const stats = {
    total: rows.length,
    draft: 0,
    pending: 0,
    published: 0,
    rejected: 0,
    views: 0,
    clicks: 0,
    registrations: 0,
    programs: 0,
    events: 0,
    announcements: 0,
  };
  rows.forEach((r) => {
    stats[r.status] += 1;
    if (r.offering_type === 'program') stats.programs += 1;
    if (r.offering_type === 'event') stats.events += 1;
    if (r.offering_type === 'announcement') stats.announcements += 1;
    stats.views += r.views_count || 0;
    stats.clicks += r.clicks_count || 0;
    stats.registrations += counts.get(r.id) ?? 0;
  });
  return stats;
}

module.exports = {
  formatOffering,
  listProviderOfferings,
  getProviderOffering,
  createProviderOffering,
  updateProviderOffering,
  deleteProviderOffering,
  providerStats,
};
