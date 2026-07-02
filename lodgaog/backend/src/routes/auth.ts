import { Router, Response } from 'express';
import { UserRegisterSchema } from '../../../shared/validators/schemas.js';
import * as dbQueries from '../models/queries.js';
import { signUserToken, AuthenticatedRequest, authenticateToken } from '../middleware/auth.js';
import { loginRateLimiter, recordIPFailedAttempt, clearIPAttempts } from '../middleware/rateLimiter.js';
import { createAuditLog } from '../services/audit.js';

const router = Router();

/**
 * Register route: Supports students, caretakers, landlords, or administrators.
 */
router.post('/register', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parseResult = UserRegisterSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.issues[0].message });
      return;
    }

    const { email, phone, full_name, user_type, is_futminna } = parseResult.data;

    // Check if user already exists
    const existingUser = await dbQueries.findUserByPhoneOrEmail(phone);
    if (existingUser) {
      res.status(409).json({ error: 'A user with this phone or email already exists.' });
      return;
    }

    const newUser = await dbQueries.createUser({
      email,
      phone,
      full_name,
      user_type,
      is_futminna
    });

    // If caretaker/landlord, register contact profile too
    if (user_type === 'caretaker' || user_type === 'landlord') {
      await dbQueries.createContact({
        full_name: newUser.full_name,
        phone: newUser.phone,
        whatsapp: '234' + newUser.phone.slice(1),
        zone: 'Gidan Kwano',
        contact_type: user_type === 'caretaker' ? 'Caretaker' : 'Landlord',
        referred_by: 'Self Registered',
        notes: 'Auto-created caretaker profile from account registration.',
        linked_user_id: newUser.user_id
      });
    }

    const token = signUserToken(newUser);

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        user_id: newUser.user_id,
        email: newUser.email,
        phone: newUser.phone,
        full_name: newUser.full_name,
        user_type: newUser.user_type
      }
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Server registration error.' });
  }
});

/**
 * Login route: accepts phone number and returns the JWT. Simulates phone OTP credentials.
 */
router.post('/login', loginRateLimiter, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const ip = req.ip || 'unknown-ip';
  try {
    const { phone } = req.body;
    if (!phone) {
      res.status(400).json({ error: 'Phone number is required.' });
      return;
    }

    const user = await dbQueries.findUserByPhoneOrEmail(phone);
    if (!user) {
      // Log failed login attempt
      recordIPFailedAttempt(ip);
      await createAuditLog(null, 'LOGIN_FAILED', {
        method: 'OTP_INIT',
        ip_address: ip,
        attempted_phone: phone
      });

      res.status(404).json({ error: 'No account found with this phone number. Please register.' });
      return;
    }

    // Trigger standard OTP prompt simulation
    res.status(200).json({
      message: 'OTP sent successfully to ' + phone,
      requireOtp: true,
      simulationCode: '123456' // Static simulation OTP code
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Login verification error.' });
  }
});

/**
 * OTP Verification route: verifies the 6-digit passcode.
 */
router.post('/verify-otp', loginRateLimiter, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const ip = req.ip || 'unknown-ip';
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      res.status(400).json({ error: 'Phone and OTP are required.' });
      return;
    }

    if (otp !== '123456') {
      // Log failed verification attempt
      recordIPFailedAttempt(ip);
      await createAuditLog(null, 'LOGIN_FAILED', {
        method: 'OTP_VERIFY_BAD_CODE',
        ip_address: ip,
        attempted_phone: phone
      });

      res.status(400).json({ error: 'Invalid verification passcode. Use simulator code [123456].' });
      return;
    }

    const user = await dbQueries.findUserByPhoneOrEmail(phone);
    if (!user) {
      recordIPFailedAttempt(ip);
      await createAuditLog(null, 'LOGIN_FAILED', {
        method: 'OTP_VERIFY_USER_NOT_FOUND',
        ip_address: ip,
        attempted_phone: phone
      });

      res.status(404).json({ error: 'User does not exist.' });
      return;
    }

    // Success login
    clearIPAttempts(ip);
    await createAuditLog(user.user_id, 'LOGIN_SUCCESS', {
      method: 'OTP',
      ip_address: ip
    });

    const token = signUserToken(user);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        phone: user.phone,
        full_name: user.full_name,
        user_type: user.user_type
      }
    });
  } catch (error) {
    console.error('OTP Verification Error:', error);
    res.status(500).json({ error: 'Verification error' });
  }
});

/**
 * Google OAuth login/registration entry point.
 */
router.post('/google-login', loginRateLimiter, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const ip = req.ip || 'unknown-ip';
  try {
    const { email, full_name } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Google email is required' });
      return;
    }

    let user = await dbQueries.findUserByPhoneOrEmail(email);

    if (!user) {
      // Create new user, defaulting user_type to 'student'
      user = await dbQueries.createUser({
        email,
        phone: '', // empty phone initially, will prompt to bind mobile
        full_name: full_name || 'Google User',
        user_type: 'student'
      });
    }

    // Prompt for phone if empty
    if (!user.phone) {
      res.status(200).json({
        requirePhone: true,
        message: 'Google login successful. Please supply your contact mobile number to complete your profile.',
        user: {
          user_id: user.user_id,
          email: user.email,
          phone: '',
          full_name: user.full_name,
          user_type: user.user_type
        }
      });
      return;
    }

    // Success login
    clearIPAttempts(ip);
    await createAuditLog(user.user_id, 'LOGIN_SUCCESS', {
      method: 'GOOGLE',
      ip_address: ip,
      email
    });

    const token = signUserToken(user);
    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        phone: user.phone,
        full_name: user.full_name,
        user_type: user.user_type
      }
    });
  } catch (error) {
    console.error('Google login route error:', error);
    res.status(500).json({ error: 'Error processing Google authentication.' });
  }
});

/**
 * Link phone number after successful Google authentication.
 */
router.post('/google-complete-phone', loginRateLimiter, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const ip = req.ip || 'unknown-ip';
  try {
    const { email, phone, is_futminna } = req.body;
    if (!email || !phone) {
      res.status(400).json({ error: 'Email and phone number are required.' });
      return;
    }

    if (!phone.match(/^0[789]\d{9}$/)) {
      res.status(400).json({ error: 'Please provide a valid 11-digit mobile number starting with 07/08/09.' });
      return;
    }

    // Check conflict
    const userWithPhone = await dbQueries.findUserByPhoneOrEmail(phone);
    if (userWithPhone && userWithPhone.email !== email) {
      res.status(409).json({ error: 'A user with this mobile number already exists.' });
      return;
    }

    const user = await dbQueries.findUserByPhoneOrEmail(email);
    if (!user) {
      res.status(404).json({ error: 'Google account not registered.' });
      return;
    }

    const updatedUser = await dbQueries.updateUserPhone(user.user_id, phone, is_futminna);

    clearIPAttempts(ip);
    await createAuditLog(updatedUser.user_id, 'LOGIN_SUCCESS', {
      method: 'GOOGLE_LINK_PHONE',
      ip_address: ip,
      email,
      phone
    });

    const token = signUserToken(updatedUser);
    res.status(200).json({
      message: 'Google login and mobile verification successfully completed.',
      token,
      user: {
        user_id: updatedUser.user_id,
        email: updatedUser.email,
        phone: updatedUser.phone,
        full_name: updatedUser.full_name,
        user_type: updatedUser.user_type
      }
    });
  } catch (error) {
    console.error('Google complete phone error:', error);
    res.status(500).json({ error: 'Error completing Google profile setup.' });
  }
});

/**
 * PUT /api/auth/profile
 * Update current user's profile details
 */
router.put('/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user_id = req.user?.user_id;
    if (!user_id) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    const { full_name, phone } = req.body;
    if (!full_name || !phone) {
      res.status(400).json({ error: 'Full name and phone are required.' });
      return;
    }

    const updatedUser = await dbQueries.updateUserProfile(user_id, full_name, phone);
    res.status(200).json({
      message: 'Profile updated successfully.',
      user: {
        user_id: updatedUser.user_id,
        email: updatedUser.email,
        phone: updatedUser.phone,
        full_name: updatedUser.full_name,
        user_type: updatedUser.user_type
      }
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
