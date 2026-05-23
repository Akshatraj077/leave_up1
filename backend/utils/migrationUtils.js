const Holiday = require('../models/Holiday');

/**
 * One-time migration: sets isGlobal = true and applicableStates = []
 * on all existing Holiday documents that predate this feature.
 * Safe to run on every boot — the $exists guard prevents re-processing.
 */
const migrateHolidaysToGlobal = async () => {
  try {
    const result = await Holiday.updateMany(
      { isGlobal: { $exists: false } },
      { $set: { isGlobal: true, applicableStates: [] } }
    );
    if (result.modifiedCount > 0) {
      console.log(`[Migration] Backfilled isGlobal=true on ${result.modifiedCount} existing holidays.`);
    }
  } catch (err) {
    console.error('[Migration] migrateHolidaysToGlobal error:', err);
    // Do NOT throw — server must still boot even if migration fails
  }
};

module.exports = { migrateHolidaysToGlobal };
