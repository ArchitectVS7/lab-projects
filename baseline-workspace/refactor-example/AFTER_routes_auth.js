/**
 * AFTER: routes/auth.js (~30 lines)
 * 
 * Thin route layer - just HTTP concerns:
 * 1. Parse request
 * 2. Validate input
 * 3. Call service
 * 4. Send response
 */

const express = require('express');
const { validateRegister } = require('../validators/authValidator');
const authService = require('../services/authService');

const router = express.Router();

/**
 * POST /auth/register
 * Register a new user account
 */
router.post('/register', async (req, res, next) => {
  try {
    // 1. Validate input
    const validation = validateRegister(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    // 2. Call service
    const result = await authService.registerUser(validation.data);

    // 3. Send response
    res.status(201).json(result);

  } catch (err) {
    // Let error handler middleware deal with it
    next(err);
  }
});

module.exports = router;
