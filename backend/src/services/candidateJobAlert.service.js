'use strict';

const { JobAlert } = require('../models');
const ApiError = require('../utils/ApiError');
const { generateUuid } = require('../utils/uuid');

function formatJobAlert(alert) {
  return {
    id: alert.id,
    candidateId: alert.candidate_id,
    searchFilters: alert.search_filters,
    label: alert.label,
    isActive: Boolean(alert.is_active),
    frequency: alert.frequency,
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
