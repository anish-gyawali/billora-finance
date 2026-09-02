import type { ApiErrorDetail } from "../types/index.js";

export enum ErrorCodes {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  CONFLICT = "CONFLICT", // Email/PAN exists
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  BAD_REQUEST = "BAD_REQUEST",
  INTERNAL = "INTERNAL_ERROR",
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: ApiErrorDetail[] | undefined;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string | ErrorCodes = ErrorCodes.INTERNAL,
    isOperational: boolean = true,
    details?: ApiErrorDetail[]
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = "Bad request", details?: ApiErrorDetail[]) {
    super(message, 400, "BAD_REQUEST", true, details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = "Validation failed", details?: ApiErrorDetail[]) {
    super(message, 422, "VALIDATION_ERROR", true, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, 401, "UNAUTHORIZED", true);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Access denied") {
    super(message, 403, "FORBIDDEN", true);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404, "NOT_FOUND", true);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Resource conflict") {
    super(message, 409, "CONFLICT", true);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = "Internal server error") {
    super(message, 500, "INTERNAL_SERVER_ERROR", false);
  }
}

export class EmailAlreadyExistsError extends ConflictError {
  constructor(email?: string) {
    super(
      email
        ? `A user with email '${email}' already exists`
        : "A user with this email already exists"
    );
  }
}

export class WeakPasswordError extends ValidationError {
  constructor(message: string = "Password does not meet complexity requirements") {
    super(message);
  }
}
