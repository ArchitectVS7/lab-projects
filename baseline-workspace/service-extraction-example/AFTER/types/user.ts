/**
 * User-related type definitions
 * 
 * DTOs (Data Transfer Objects) define the shape of data
 * moving between layers. Keeps contracts explicit.
 */

// Input DTOs (what comes in)
export interface RegisterUserDTO {
  email: string;
  password: string;
  name?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

// Output DTOs (what goes out)
export interface UserResponse {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
}

export interface AuthResponse {
  user: UserResponse;
  token: string;
}

// Internal types
export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}
