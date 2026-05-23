const express = require('express');
const router = express.Router();
const {
  getHolidays,
  syncHolidays,
  addCustomHoliday,
  updateHoliday,
  deleteHoliday
} = require('../controllers/publicHolidayController');

// GET all holidays for a year (employee + admin)
router.get('/', getHolidays);

// POST sync holidays from API (admin only — auth at prefix level)
router.post('/sync', syncHolidays);

// POST add a custom holiday (admin only) — both routes supported
router.post('/', addCustomHoliday);
router.post('/custom', addCustomHoliday);

// PUT update a holiday's name/note (admin only)
router.put('/:id', updateHoliday);

// DELETE soft-delete a holiday (admin only)
router.delete('/:id', deleteHoliday);

module.exports = router;
