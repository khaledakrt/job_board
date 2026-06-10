'use strict';

const { JobAlert } = require('../models');
const ApiError = require('../utils/ApiError');
const { generateUuid } = require('../utils/uuid');
const { CANDIDATE_LIMITS } = require('../config/constants');

function formatJobAlert(alert) {
  return {
    id: alert.id,
    candidateId: alert.candidate_id,
    searchFilters: alert.search_filters,
    label: alert.label,
    isActive: Boolean(alert.is_active),
    frequency: alert.frequency,
    lastSentAt: alert.last_sent_at,
    createdAt: alert.created_at,
    updatedAt: alert.updated_at,
  };
}

async function listJobAlerts(candidateId) {
  const alerts = await JobAlert.findAll({
    where: { candidate_id: candidateId },
    order: [['created_at', 'DESC']],
  });

  return alerts.map(formatJobAlert);
}

async function createJobAlert({ candidateId, searchFilters, label, frequency, isActive }) {
  const alertsCount = await JobAlert.count({ where: { candidate_id: candidateId } });
  if (alertsCount >= CANDIDATE_LIMITS.MAX_JOB_ALERTS) {
    throw ApiError.conflict(
      `Vous ne pouvez pas créer plus de ${CANDIDATE_LIMITS.MAX_JOB_ALERTS} alertes emploi. Supprimez une alerte pour en créer une nouvelle.`
    );
  }

  const alert = await JobAlert.create({
    id: generateUuid(),
    candidate_id: candidateId,
    search_filters: searchFilters,
    label: label || null,
    frequency: frequency || 'weekly',
    is_active: isActive !== false,
    created_at: new Date(),
    updated_at: new Date(),
  });

  return formatJobAlert(alert);
}

async function updateJobAlert({ candidateId, alertId, payload }) {
  const alert = await JobAlert.findOne({
    where: { id: alertId, candidate_id: candidateId },
  });

  if (!alert) {
    throw ApiError.notFound('Job alert not found');
  }

  await alert.update({
    search_filters: payload.searchFilters ?? alert.search_filters,
    label: payload.label !== undefined ? payload.label : alert.label,
    frequency: payload.frequency ?? alert.frequency,
    is_active: payload.isActive !== undefined ? payload.isActive : alert.is_active,
    updated_at: new Date(),
  });

  return formatJobAlert(alert);
}

async function deleteJobAlert({ candidateId, alertId }) {
  const alert = await JobAlert.findOne({
    where: { id: alertId, candidate_id: candidateId },
  });

  if (!alert) {
    throw ApiError.notFound('Job alert not found');
  }

  await alert.destroy();
  return { message: 'Job alert deleted' };
}

module.exports = {
  listJobAlerts,
  createJobAlert,
  updateJobAlert,
  deleteJobAlert,
};
