/**
 * Authentication and registration data models.
 */

export interface LoginRequest {
  employeeIdOrEmail: string;
  password: string;
}

export interface RegisterRequest {
  employeeId: string;
  fullName: string;
  department: string;
  role: string;
  mobileNo: string;
  email: string;
  password: string;
}

export interface User {
  id: number;
  employeeId: string;
  fullName: string;
  email: string;
  department: string;
  role: string;
  status: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  user: User;
}

/**
 * Generic Spring Boot ApiResponse wrapper.
 * All REST endpoints in this application return this envelope.
 */
export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  timestamp: string;
  payload: T;
}
