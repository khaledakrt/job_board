'use strict';

const { z } = require('zod');
const { APPLICATION_STATUS } = require('../config/constants');

const updateApplicationStatusSchema = z.object({
  status: z.enum([
    APPLICATION_STATUS.APPLIED,
    APPLICATION_STATUS.SCREENING,
    APPLICATION_STATUS.INTERVIEW,
    APPLICATION_STATUS.OFFER,
    APPLICATION_STATUS.REJECTED,
  ]),
  rating: z.coerce.number().int().min(1).max(5).optional().nullable(),
  evaluationText: z.string().trim().min(1).max(5000).optional().nullable(),
});

const createApplicationNoteSchema = z.object({
  noteText: z.string().trim().min(1).max(5000),
});

module.exports = {
  updateApplicationStatusSchema,
  createApplicationNoteSchema,
};
