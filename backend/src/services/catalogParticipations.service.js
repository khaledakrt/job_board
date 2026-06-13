'use strict';

const { Op } = require('sequelize');
const {
  User,
  CandidateProfile,
  TrainingCenter,
  TrainingFormation,
  TrainingEvent,
  FormationParticipation,
  EventParticipation,
} = require('../models');
const { env } = require('../config');
const { getTrainingCenterForUser } = require('../utils/catalogProviderAccess.util');
const ApiError = require('../utils/ApiError');
const emailService = require('./email.service');
const { parsePagination, buildPaginatedResponse } = require('../utils/pagination');

const userInclude = {
  model: User,
  as: 'user',
  attributes: ['id', 'email'],
  include: [
    {
      model: CandidateProfile,
      as: 'candidateProfile',
      attributes: [
        'id',
        'first_name',
        'last_name',
        'phone',
        'professional_title',
        'avatar_url',
      ],
    },
  ],
};

function formatCandidateFromUser(user) {
  const profile = user?.candidateProfile;
  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() ||
    user?.email ||
    'Candidat';
  return {
    userId: user.id,
    email: user.email,
    firstName: profile?.first_name ?? null,
    lastName: profile?.last_name ?? null,
    displayName,
    phone: profile?.phone ?? null,
    professionalTitle: profile?.professional_title ?? null,
    avatarUrl: profile?.avatar_url ?? null,
  };
}

function participationTypeLabel(type) {
  return type === 'registered' ? 'Inscription' : 'Intérêt manifesté';
}

/** Nombre affiché sur le catalogue public (intéressés + inscrits), plafonné aux places si définies. */
function publicParticipantsCount(totalCount, seats) {
  const n = Math.max(0, Number(totalCount) || 0);
  if (seats != null && seats > 0) {
    return Math.min(n, seats);
  }
  return n;
}

async function countParticipantsByFormationIds(formationIds) {
  const map = new Map();
  if (!formationIds.length) return map;
  const rows = await FormationParticipation.findAll({
    where: { formation_id: { [Op.in]: formationIds } },
    attributes: ['formation_id'],
  });
  rows.forEach((r) => {
    map.set(r.formation_id, (map.get(r.formation_id) || 0) + 1);
  });
  return map;
}

async function countParticipantsByEventIds(eventIds) {
  const map = new Map();
  if (!eventIds.length) return map;
  const rows = await EventParticipation.findAll({
    where: { event_id: { [Op.in]: eventIds } },
    attributes: ['event_id'],
  });
  rows.forEach((r) => {
    map.set(r.event_id, (map.get(r.event_id) || 0) + 1);
  });
  return map;
}

async function countParticipantsForFormation(formationId) {
  return FormationParticipation.count({ where: { formation_id: formationId } });
}

async function countParticipantsForEvent(eventId) {
  return EventParticipation.count({ where: { event_id: eventId } });
}

async function countRegisteredForFormation(formationId) {
  return FormationParticipation.count({
    where: { formation_id: formationId, participation_type: 'registered' },
  });
}

async function countRegisteredForEvent(eventId) {
  return EventParticipation.count({
    where: { event_id: eventId, participation_type: 'registered' },
  });
}

async function countRegisteredByFormationIds(formationIds) {
  const map = new Map();
  if (!formationIds.length) return map;
  const rows = await FormationParticipation.findAll({
    where: {
      formation_id: { [Op.in]: formationIds },
      participation_type: 'registered',
    },
    attributes: ['formation_id'],
  });
  rows.forEach((r) => {
    map.set(r.formation_id, (map.get(r.formation_id) || 0) + 1);
  });
  return map;
}

async function countRegisteredByEventIds(eventIds) {
  const map = new Map();
  if (!eventIds.length) return map;
  const rows = await EventParticipation.findAll({
    where: {
      event_id: { [Op.in]: eventIds },
      participation_type: 'registered',
    },
    attributes: ['event_id'],
  });
  rows.forEach((r) => {
    map.set(r.event_id, (map.get(r.event_id) || 0) + 1);
  });
  return map;
}

async function assertFormationRegistrationAllowed(formationId, userId) {
  const formation = await TrainingFormation.findByPk(formationId, {
    attributes: ['id', 'seats'],
  });
  if (!formation?.seats || formation.seats <= 0) return;

  const alreadyRegistered = await FormationParticipation.findOne({
    where: {
      formation_id: formationId,
      user_id: userId,
      participation_type: 'registered',
    },
  });
  if (alreadyRegistered) return;

  const registeredCount = await countRegisteredForFormation(formationId);
  if (registeredCount >= formation.seats) {
    throw ApiError.conflict('Plus de places disponibles pour cette formation.');
  }
}

async function assertEventRegistrationAllowed(eventId, userId) {
  const event = await TrainingEvent.findByPk(eventId, { attributes: ['id', 'seats'] });
  if (!event?.seats || event.seats <= 0) return;

  const alreadyRegistered = await EventParticipation.findOne({
    where: {
      event_id: eventId,
      user_id: userId,
      participation_type: 'registered',
    },
  });
  if (alreadyRegistered) return;

  const registeredCount = await countRegisteredForEvent(eventId);
  if (registeredCount >= event.seats) {
    throw ApiError.conflict('Plus de places disponibles pour cet événement.');
  }
}

function formatParticipationRow(row, offeringKind) {
  const offering = offeringKind === 'formation' ? row.formation : row.event;
  return {
    id: row.id,
    offeringKind,
    offeringId: offering.id,
    offeringTitle: offering.title,
    participationType: row.participation_type,
    participationLabel: participationTypeLabel(row.participation_type),
    createdAt: row.created_at,
    candidate: formatCandidateFromUser(row.user),
  };
}

function summarizeItems(items) {
  const interested = items.filter((i) => i.participationType === 'interested').length;
  const registered = items.filter((i) => i.participationType === 'registered').length;
  return {
    total: items.length,
    interested,
    registered,
    formations: items.filter((i) => i.offeringKind === 'formation').length,
    events: items.filter((i) => i.offeringKind === 'event').length,
  };
}

async function resolveCenterNotificationEmails(center) {
  const emails = new Set();
  if (center.email) {
    emails.add(String(center.email).trim().toLowerCase());
  }
  if (center.user_id) {
    const owner = await User.findByPk(center.user_id, { attributes: ['email'] });
    if (owner?.email) {
      emails.add(String(owner.email).trim().toLowerCase());
    }
  }
  return [...emails];
}

async function countParticipationsForCenter(centerId) {
  const [formationIds, eventIds] = await Promise.all([
    TrainingFormation.findAll({
      where: { center_id: centerId },
      attributes: ['id'],
    }).then((rows) => rows.map((r) => r.id)),
    TrainingEvent.findAll({
      where: { center_id: centerId },
      attributes: ['id'],
    }).then((rows) => rows.map((r) => r.id)),
  ]);

  const counts = { total: 0, interested: 0, registered: 0 };

  if (formationIds.length) {
    const rows = await FormationParticipation.findAll({
      where: { formation_id: { [Op.in]: formationIds } },
      attributes: ['participation_type'],
    });
    counts.total += rows.length;
    rows.forEach((r) => {
      if (r.participation_type === 'interested') counts.interested += 1;
      else counts.registered += 1;
    });
  }

  if (eventIds.length) {
    const rows = await EventParticipation.findAll({
      where: { event_id: { [Op.in]: eventIds } },
      attributes: ['participation_type'],
    });
    counts.total += rows.length;
    rows.forEach((r) => {
      if (r.participation_type === 'interested') counts.interested += 1;
      else counts.registered += 1;
    });
  }

  return counts;
}

async function listProviderParticipations(userId, query = {}) {
  const center = await getTrainingCenterForUser(userId);
  const { offeringKind, offeringId, participationType } = query;

  if (offeringId) {
    if (offeringKind === 'formation') {
      const formation = await TrainingFormation.findOne({
        where: { id: offeringId, center_id: center.id },
      });
      if (!formation) throw ApiError.notFound('Formation introuvable');
    } else if (offeringKind === 'event') {
      const event = await TrainingEvent.findOne({
        where: { id: offeringId, center_id: center.id },
      });
      if (!event) throw ApiError.notFound('Événement introuvable');
    } else {
      const [formation, event] = await Promise.all([
        TrainingFormation.findOne({ where: { id: offeringId, center_id: center.id } }),
        TrainingEvent.findOne({ where: { id: offeringId, center_id: center.id } }),
      ]);
      if (!formation && !event) throw ApiError.notFound('Publication introuvable');
    }
  }

  const participationWhere = participationType ? { participation_type: participationType } : {};

  if ((offeringKind === 'formation' || offeringKind === 'event') && (query.page !== undefined || query.limit !== undefined)) {
    const { page, limit, offset } = parsePagination(query);
    const isFormation = offeringKind === 'formation';
    const participationModel = isFormation ? FormationParticipation : EventParticipation;
    const offeringModel = isFormation ? TrainingFormation : TrainingEvent;
    const participationKey = isFormation ? 'formation_id' : 'event_id';
    const offeringAlias = isFormation ? 'formation' : 'event';
    const offeringWhere = { center_id: center.id };
    if (offeringId) offeringWhere.id = offeringId;

    const { rows, count } = await participationModel.findAndCountAll({
      where: participationWhere,
      include: [
        userInclude,
        {
          model: offeringModel,
          as: offeringAlias,
          where: offeringWhere,
          attributes: ['id', 'title'],
          required: true,
        },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
      distinct: true,
    });

    const summaryWhere = { ...participationWhere };
    if (offeringId) {
      summaryWhere[participationKey] = offeringId;
    }
    const allScopedRows = await participationModel.findAll({
      where: summaryWhere,
      include: [
        {
          model: offeringModel,
          as: offeringAlias,
          where: offeringWhere,
          attributes: ['id', 'title'],
          required: true,
        },
      ],
      attributes: ['id', 'participation_type', 'created_at'],
    });
    const summaryItems = allScopedRows.map((row) => ({
      participationType: row.participation_type,
      offeringKind,
    }));

    return {
      ...buildPaginatedResponse({
        rows: rows.map((r) => formatParticipationRow(r, offeringKind)),
        count,
        page,
        limit,
      }),
      summary: summarizeItems(summaryItems),
    };
  }

  const items = [];
  const loadFormations = offeringKind !== 'event';
  const loadEvents = offeringKind !== 'formation';

  if (loadFormations) {
    const formationFilter = { center_id: center.id };
    if (offeringId && offeringKind !== 'event') {
      formationFilter.id = offeringId;
    }
    const formations = await TrainingFormation.findAll({
      where: formationFilter,
      attributes: ['id'],
    });
    const formationIds = formations.map((f) => f.id);
    if (formationIds.length) {
      const rows = await FormationParticipation.findAll({
        where: { formation_id: { [Op.in]: formationIds }, ...participationWhere },
        include: [
          userInclude,
          {
            model: TrainingFormation,
            as: 'formation',
            attributes: ['id', 'title'],
          },
        ],
        order: [['created_at', 'DESC']],
      });
      items.push(...rows.map((r) => formatParticipationRow(r, 'formation')));
    }
  }

  if (loadEvents) {
    const eventFilter = { center_id: center.id };
    if (offeringId && offeringKind !== 'formation') {
      eventFilter.id = offeringId;
    }
    const events = await TrainingEvent.findAll({
      where: eventFilter,
      attributes: ['id'],
    });
    const eventIds = events.map((e) => e.id);
    if (eventIds.length) {
      const rows = await EventParticipation.findAll({
        where: { event_id: { [Op.in]: eventIds }, ...participationWhere },
        include: [
          userInclude,
          {
            model: TrainingEvent,
            as: 'event',
            attributes: ['id', 'title'],
          },
        ],
        order: [['created_at', 'DESC']],
      });
      items.push(...rows.map((r) => formatParticipationRow(r, 'event')));
    }
  }

  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (query.page !== undefined || query.limit !== undefined) {
    const { page, limit, offset } = parsePagination(query);
    return {
      ...buildPaginatedResponse({
        rows: items.slice(offset, offset + limit),
        count: items.length,
        page,
        limit,
      }),
      summary: summarizeItems(items),
    };
  }

  return {
    items,
    summary: summarizeItems(items),
  };
}

async function notifyProviderParticipation({
  center,
  offeringKind,
  offeringTitle,
  participationType,
  candidateUser,
}) {
  const candidate = formatCandidateFromUser(candidateUser);
  const typeLabel = participationTypeLabel(participationType);
  const offeringLabel = offeringKind === 'formation' ? 'formation' : 'événement';
  const dashboardUrl = `${env.CLIENT_URL}/provider/centre/participants`;

  const emails = await resolveCenterNotificationEmails(center);
  if (!emails.length) return;

  await Promise.all(
    emails.map((to) =>
      emailService.sendProviderParticipationEmail({
        to,
        candidateName: candidate.displayName,
        offeringTitle,
        offeringKind: offeringLabel,
        participationLabel: typeLabel,
        dashboardUrl,
      })
    )
  );
}

async function notifyFormationParticipation(formationId, candidateUser, participationType) {
  const formation = await TrainingFormation.findByPk(formationId, {
    include: [{ model: TrainingCenter, as: 'center' }],
  });
  if (!formation?.center) return;

  const fullUser = await User.findByPk(candidateUser.id, {
    attributes: ['id', 'email'],
    include: [{ model: CandidateProfile, as: 'candidateProfile' }],
  });

  await notifyProviderParticipation({
    center: formation.center,
    offeringKind: 'formation',
    offeringTitle: formation.title,
    participationType,
    candidateUser: fullUser || candidateUser,
  });
}

async function notifyEventParticipation(eventId, candidateUser, participationType) {
  const event = await TrainingEvent.findByPk(eventId, {
    include: [{ model: TrainingCenter, as: 'center' }],
  });
  if (!event?.center) return;

  const fullUser = await User.findByPk(candidateUser.id, {
    attributes: ['id', 'email'],
    include: [{ model: CandidateProfile, as: 'candidateProfile' }],
  });

  await notifyProviderParticipation({
    center: event.center,
    offeringKind: 'event',
    offeringTitle: event.title,
    participationType,
    candidateUser: fullUser || candidateUser,
  });
}

module.exports = {
  listProviderParticipations,
  countParticipationsForCenter,
  notifyFormationParticipation,
  notifyEventParticipation,
  formatCandidateFromUser,
  publicParticipantsCount,
  countParticipantsForFormation,
  countParticipantsForEvent,
  countParticipantsByFormationIds,
  countParticipantsByEventIds,
  countRegisteredForFormation,
  countRegisteredForEvent,
  countRegisteredByFormationIds,
  countRegisteredByEventIds,
  assertFormationRegistrationAllowed,
  assertEventRegistrationAllowed,
};
