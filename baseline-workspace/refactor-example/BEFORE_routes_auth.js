/**
 * BEFORE: routes/auth.js (150+ lines, mixed concerns)
 * 
 * Problems:
 * - Validation logic inline
 * - Business logic mixed with HTTP handling
 * - Hard to test (need HTTP context)
 * - Duplicated error handling
 * - Email sending blocks response
 */

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const nodemailer = require('nodemailer');

const router = express.Router();

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // ========== VALIDATION (30 lines) ==========
    if (!email || !password || !name) {
      return res.status(400).json({ 
        error: 'Email, password, and name are required' 
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Password strength validation
    if (password.length < 8) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters' 
      });
    }

    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ 
        error: 'Password must contain an uppercase letter' 
      });
    }

    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ 
        error: 'Password must contain a number' 
      });
    }

    // Name validation
    if (name.length < 2 || name.length > 50) {
      return res.status(400).json({ 
        error: 'Name must be between 2 and 50 characters' 
      });
    }

    // ========== BUSINESS LOGIC (60 lines) ==========
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate email verification token
    const verificationToken = require('crypto').randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      name: name.trim(),
      verified: false,
      verificationToken,
      verificationExpires,
      createdAt: new Date(),
    });

    // Generate JWT token
    const token = jwt.sign(
      { sub: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Send verification email (BLOCKING - slows down response)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const verificationUrl = `${process.env.APP_URL}/verify?token=${verificationToken}`;
    
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: 'Verify your email',
      html: `
        <h1>Welcome, ${user.name}!</h1>
        <p>Click the link below to verify your email:</p>
        <a href="${verificationUrl}">${verificationUrl}</a>
        <p>This link expires in 24 hours.</p>
      `,
    });

    // ========== RESPONSE ==========
    res.status(201).json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        verified: user.verified,
      },
      token,
    });

  } catch (err) {
    console.error('Registration error:', err);
    
    // Mongoose duplicate key error
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    
    res.status(500).json({ error: 'Registration failed' });
  }
});

module.exports = router;
