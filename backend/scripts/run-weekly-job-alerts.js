'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

require('../src/models');
const { connectDatabase, disconnectDatabase } = require('../src/database/connection');
const { sendWeeklyJobAlerts } = require('../src/services/weeklyJobAlert.service');
const logger = require('../src/utils/logger');

async function main() {
  await connectDatabase();
  const result = await sendWeeklyJobAlerts();
  logger.info(
    `[WeeklyJobAlertsScript] processed=${result.processed} sent=${result.sent} skipped=${result.skipped}`
  );
}

main()
  .catch((error) => {
    logger.error('[WeeklyJobAlertsScript] Failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
