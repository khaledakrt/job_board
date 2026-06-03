'use strict';

const bcrypt = require('bcrypt');
const { BCRYPT_ROUNDS } = require('../config/constants');

async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
}

async function comparePassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}

module.exports = {
  hashPassword,
  comparePassword,
};
