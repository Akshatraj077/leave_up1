const axios = require('axios');
const PublicHoliday = require('../models/PublicHoliday');

/**
 * Internal utility — fetches holidays from Calendarific API and stores them.
 * Does NOT overwrite existing records for the given year.
 */
const fetchAndStoreHolidays = async (year) => {
  const apiKey = process.env.CALENDARIFIC_API_KEY;
  if (!apiKey) {
    throw new Error('CALENDARIFIC_API_KEY is not configured');
  }

  const url = `https://calendarific.com/api/v2/holidays?api_key=${apiKey}&country=IN&year=${year}`;
  const response = await axios.get(url);

  if (response.data?.meta?.code !== 200) {
    throw new Error(response.data?.meta?.error_detail || 'Calendarific API error');
  }

  const rawHolidays = response.data?.response?.holidays || [];

  const documents = rawHolidays.map((h) => {
    const counties = h.states; // Calendarific uses "states" for sub-regions
    const isNational = !counties || !Array.isArray(counties) || counties.length === 0;

    return {
      name: h.name,
      date: h.date?.iso?.split('T')[0], // YYYY-MM-DD
      year: Number(year),
      type: isNational ? 'NATIONAL' : 'REGIONAL',
      regions: isNational ? [] : counties.map((s) => s.iso || s.abbrev || ''),
      isCustom: false,
      isDeleted: false,
      source: 'API'
    };
  });

  if (documents.length === 0) return;

  // Insert only new records — skip duplicates gracefully
  try {
    await PublicHoliday.insertMany(documents, { ordered: false });
  } catch (err) {
    // Error code 11000 = duplicate key — expected and safe to ignore
    if (err.code !== 11000 && !err.writeErrors?.every((e) => e.err?.code === 11000)) {
      throw err;
    }
  }
};

/**
 * GET / — returns all non-deleted public holidays for a given year.
 * Falls back to fetching from API if no records exist.
 */
const getHolidays = async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();

    let holidays = await PublicHoliday.find({ year, isDeleted: { $ne: true } }).sort({ date: 1 });

    // Fallback: if 0 records exist, auto-fetch from API first
    if (holidays.length === 0) {
      try {
        await fetchAndStoreHolidays(year);
        holidays = await PublicHoliday.find({ year, isDeleted: { $ne: true } }).sort({ date: 1 });
      } catch (fetchErr) {
        console.error('[PublicHoliday] Auto-fetch failed:', fetchErr.message);
        // Return empty list rather than crashing
      }
    }

    return res.json({ success: true, data: holidays });
  } catch (err) {
    console.error('[PublicHoliday] getHolidays error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve holidays' });
  }
};

/**
 * POST /sync — admin only. Re-fetches holidays from API for the given year.
 */
const syncHolidays = async (req, res) => {
  try {
    const year = Number(req.body.year);
    if (!year) {
      return res.status(400).json({ success: false, message: 'Year is required' });
    }

    const currentYear = new Date().getFullYear();
    if (year < currentYear) {
      return res.status(400).json({ success: false, message: 'Cannot re-sync past years' });
    }

    await fetchAndStoreHolidays(year);

    const holidays = await PublicHoliday.find({ year, isDeleted: { $ne: true } }).sort({ date: 1 });
    return res.json({ success: true, data: holidays });
  } catch (err) {
    console.error('[PublicHoliday] syncHolidays error:', err);
    return res.status(500).json({ success: false, message: 'Sync failed: ' + err.message });
  }
};

/**
 * POST /custom — admin only. Adds a custom holiday.
 */
const addCustomHoliday = async (req, res) => {
  try {
    const { name, date, note, type, isGlobal, applicableStates } = req.body;

    if (!name || !date) {
      return res.status(400).json({ success: false, message: 'Name and date are required' });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, message: 'Date must be in YYYY-MM-DD format' });
    }

    const derivedYear = Number(date.split('-')[0]);
    const currentYear = new Date().getFullYear();

    if (derivedYear < currentYear) {
      return res.status(400).json({ success: false, message: 'Cannot add custom holidays for past years' });
    }

    const holiday = await PublicHoliday.create({
      name: name.trim(),
      date,
      year: derivedYear,
      type: type || 'NATIONAL',
      regions: [],
      isGlobal: isGlobal !== false, // default true
      applicableStates: Array.isArray(applicableStates) ? applicableStates : [],
      note: note || '',
      isCustom: true,
      isDeleted: false,
      source: 'MANUAL'
    });

    return res.status(201).json({ success: true, data: holiday });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'A holiday with that name and date already exists' });
    }
    console.error('[PublicHoliday] addCustomHoliday error:', err);
    return res.status(500).json({ success: false, message: 'Failed to add custom holiday' });
  }
};

/**
 * PUT /:id — admin only. Updates name and/or note of a holiday.
 */
const updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, note, type, isGlobal, applicableStates } = req.body;

    const holiday = await PublicHoliday.findById(id);
    if (!holiday) {
      return res.status(404).json({ success: false, message: 'Holiday not found' });
    }

    // Only update fields that are provided
    if (name !== undefined) holiday.name = name.trim();
    if (note !== undefined) holiday.note = note;
    if (type !== undefined) holiday.type = type;
    if (isGlobal !== undefined) holiday.isGlobal = isGlobal;
    if (applicableStates !== undefined) holiday.applicableStates = Array.isArray(applicableStates) ? applicableStates : [];

    await holiday.save();
    return res.json({ success: true, data: holiday });
  } catch (err) {
    console.error('[PublicHoliday] updateHoliday error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update holiday' });
  }
};

/**
 * DELETE /:id — admin only. Soft-deletes a holiday.
 */
const deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;

    const holiday = await PublicHoliday.findById(id);
    if (!holiday) {
      return res.status(404).json({ success: false, message: 'Holiday not found' });
    }

    const currentYear = new Date().getFullYear();
    if (holiday.year !== currentYear) {
      return res.status(400).json({ success: false, message: 'Can only delete holidays for the current year' });
    }

    holiday.isDeleted = true;
    await holiday.save();
    return res.json({ success: true, message: 'Holiday deleted' });
  } catch (err) {
    console.error('[PublicHoliday] deleteHoliday error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete holiday' });
  }
};

module.exports = {
  fetchAndStoreHolidays,
  getHolidays,
  syncHolidays,
  addCustomHoliday,
  updateHoliday,
  deleteHoliday
};
