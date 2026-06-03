'use strict';

const express = require('express');
const recruiterTeamController = require('../controllers/recruiterTeam.controller');
const authenticate = require('../middleware/authenticate');
const { requireRecruiterRole } = require('../middleware/authorize');
const requireRecruiter = require('../middleware/requireRecruiter');
const { requireCompanyOwner } = require('../middleware/checkPermission');
const { validateBody } = require('../middleware/validate');
const { validateParams } = require('../middleware/validateParams');
const { memberIdParamSchema } = require('../validators/common.validator');
const {
  inviteTeamMemberSchema,
  updateTeamMemberSchema,
} = require('../validators/recruiterTeam.validator');

const router = express.Router();

router.use(authenticate);
router.use(requireRecruiterRole);
router.use(requireRecruiter);

router.get('/', recruiterTeamController.listTeam);

router.post(
  '/',
  requireCompanyOwner,
  validateBody(inviteTeamMemberSchema),
  recruiterTeamController.inviteMember
);

router.patch(
  '/:memberId',
  validateParams(memberIdParamSchema),
  requireCompanyOwner,
  validateBody(updateTeamMemberSchema),
  recruiterTeamController.updateMember
);

router.delete(
  '/:memberId',
  validateParams(memberIdParamSchema),
  requireCompanyOwner,
  recruiterTeamController.removeMember
);

module.exports = router;
