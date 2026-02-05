/**
 * User Service - All user-related business logic
 * 
 * Benefits:
 * - Reusable: call from routes, CLI, cron jobs, tests
 * - Testable: mock dependencies, no HTTP involved
 * - Single responsibility: only business logic
 * - Explicit dependencies: injected via constructor
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/user';
import { EmailService } from './email.service';
import { config } from '../config';
import { 
  RegisterUserDTO, 
  LoginDTO, 
  AuthResponse, 
  UserResponse,
  JwtPayload 
} from '../types/user';
import { 
  ConflictError, 
  UnauthorizedError, 
  NotFoundError 
} from '../errors';

const SALT_ROUNDS = 12;
const TOKEN_EXPIRY = '7d';

export class UserService {
  constructor(private readonly emailService: EmailService) {}

  /**
   * Register a new user
   */
  async register(data: RegisterUserDTO): Promise<AuthResponse> {
    const normalizedEmail = data.email.toLowerCase();

    // Check for existing user
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    // Create user
    const user = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      name: data.name || null,
      createdAt: new Date(),
    });

    // Generate token
    const token = this.generateToken(user);

    // Send welcome email (fire and forget)
    this.sendWelcomeEmail(user).catch(err => {
      console.error('Failed to send welcome email:', err);
    });

    return {
      user: this.toUserResponse(user),
      token,
    };
  }

  /**
   * Authenticate user and return token
   */
  async login(data: LoginDTO): Promise<AuthResponse> {
    const normalizedEmail = data.email.toLowerCase();

    // Find user
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Verify password
    const validPassword = await bcrypt.compare(data.password, user.password);
    if (!validPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Generate token
    const token = this.generateToken(user);

    return {
      user: this.toUserResponse(user),
      token,
    };
  }

  /**
   * Get user by ID
   */
  async getById(userId: string): Promise<UserResponse> {
    const user = await User.findById(userId).select('-password');
    if (!user) {
      throw new NotFoundError('User');
    }
    return this.toUserResponse(user);
  }

  /**
   * Verify JWT token and return payload
   */
  verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, config.jwtSecret) as JwtPayload;
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }
  }

  /**
   * Generate JWT token for user
   */
  private generateToken(user: IUser): string {
    const payload: JwtPayload = {
      userId: user._id.toString(),
      email: user.email,
    };
    return jwt.sign(payload, config.jwtSecret, { expiresIn: TOKEN_EXPIRY });
  }

  /**
   * Convert database model to response DTO
   */
  private toUserResponse(user: IUser): UserResponse {
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  }

  /**
   * Send welcome email to new user
   */
  private async sendWelcomeEmail(user: IUser): Promise<void> {
    await this.emailService.send({
      to: user.email,
      subject: 'Welcome!',
      template: 'welcome',
      data: { name: user.name || 'there' },
    });
  }
}

// Simple dependency injection - create singleton instance
import { emailService } from './email.service';
export const userService = new UserService(emailService);
