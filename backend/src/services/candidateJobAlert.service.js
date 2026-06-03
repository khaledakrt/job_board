'use strict';

const { JobAlert } = require('../models');
const ApiError = require('../utils/ApiError');
const { generateUuid } = require('../utils/uuid');

function formatJobAlert(alert) {
  return {
    id: alert.id,
    candidateId: alert.candidate_id,
    searchFilters: alert.search_filters,
    createdAt: alert.created_at,
  };
}

async function listJobAlerts(candidateId) {
  const alerts = await JobAlert.findAll({
    where: { candidate_id: candidateId },
    order: [['created_at', 'DESC']],
  });

  return alerts.map(formatJobAlert);
}

async function createJobAlert({ candidateId, searchFilters }) {
  const alert = await JobAlert.create({
    id: generateUuid(),
    candidate_id: candidateId,
    search_filters: searchFilters,
    created_at: new Date(),
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
  deleteJobAlert,
};
