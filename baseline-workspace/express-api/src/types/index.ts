import { Request } from 'express';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface JwtPayload {
  sub: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export interface CreateUserBody {
  name: string;
  email: string;
}

export interface ApiError {
  error: string;
}
