import { Request } from 'express';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface JwtPayload {
  userId: string;
  email?: string;
}

export interface AuthRequest<P = {}, ResBody = any, ReqBody = any> extends Request<P, ResBody, ReqBody> {
  user?: JwtPayload;
}

export interface CreateUserBody {
  name: string;
  email: string;
}

export interface UserParams {
  id: string;
}

export interface ApiError {
  error: string;
}
