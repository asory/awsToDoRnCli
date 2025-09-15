// Validation utilities for the application
// Centralized validation logic to avoid code duplication

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface PasswordValidationOptions {
  minLength?: number;
  requireLowercase?: boolean;
  requireUppercase?: boolean;
  requireNumbers?: boolean;
  requireSymbols?: boolean;
}

// Email validation
export const validateEmail = (email: string): ValidationResult => {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }

  const emailRegex = /\S+@\S+\.\S+/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Email is invalid' };
  }

  return { isValid: true };
};

// Password validation with configurable options
export const validatePassword = (
  password: string,
  options: PasswordValidationOptions = {}
): ValidationResult => {
  const {
    minLength = 8,
    requireLowercase = true,
    requireUppercase = true,
    requireNumbers = true,
    requireSymbols = true,
  } = options;

  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < minLength) {
    return {
      isValid: false,
      error: `Password must be at least ${minLength} characters long`
    };
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    return {
      isValid: false,
      error: 'Password must contain at least one lowercase letter'
    };
  }

  if (requireUppercase && !/[A-Z]/.test(password)) {
    return {
      isValid: false,
      error: 'Password must contain at least one uppercase letter'
    };
  }

  if (requireNumbers && !/\d/.test(password)) {
    return {
      isValid: false,
      error: 'Password must contain at least one number'
    };
  }

  if (requireSymbols && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return {
      isValid: false,
      error: 'Password must contain at least one special character'
    };
  }

  return { isValid: true };
};

// Cognito-specific password validation (matches amplify_outputs.json)
export const validateCognitoPassword = (password: string): ValidationResult => {
  return validatePassword(password, {
    minLength: 8,
    requireLowercase: true,
    requireUppercase: true,
    requireNumbers: true,
    requireSymbols: true,
  });
};

// Password confirmation validation
export const validatePasswordConfirmation = (
  password: string,
  confirmPassword: string
): ValidationResult => {
  if (!confirmPassword) {
    return { isValid: false, error: 'Please confirm your password' };
  }

  if (password !== confirmPassword) {
    return { isValid: false, error: 'Passwords do not match' };
  }

  return { isValid: true };
};

// Reset code validation
export const validateResetCode = (code: string): ValidationResult => {
  if (!code) {
    return { isValid: false, error: 'Reset code is required' };
  }

  if (code.length !== 6) {
    return { isValid: false, error: 'Reset code must be 6 digits' };
  }

  if (!/^\d{6}$/.test(code)) {
    return { isValid: false, error: 'Reset code must contain only numbers' };
  }

  return { isValid: true };
};

// Generic required field validation
export const validateRequired = (value: string, fieldName: string): ValidationResult => {
  if (!value || value.trim().length === 0) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  return { isValid: true };
};

// Minimum length validation
export const validateMinLength = (
  value: string,
  minLength: number,
  fieldName: string
): ValidationResult => {
  if (value.length < minLength) {
    return {
      isValid: false,
      error: `${fieldName} must be at least ${minLength} characters long`
    };
  }

  return { isValid: true };
};

// Combined validation for registration form
export const validateRegistrationForm = (
  email: string,
  password: string,
  confirmPassword: string
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error!;
  }

  const passwordValidation = validateCognitoPassword(password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.error!;
  }

  const confirmValidation = validatePasswordConfirmation(password, confirmPassword);
  if (!confirmValidation.isValid) {
    errors.confirmPassword = confirmValidation.error!;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// Combined validation for reset password form
export const validateResetPasswordForm = (
  code: string,
  newPassword: string,
  confirmPassword: string
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  const codeValidation = validateResetCode(code);
  if (!codeValidation.isValid) {
    errors.code = codeValidation.error!;
  }

  const passwordValidation = validateCognitoPassword(newPassword);
  if (!passwordValidation.isValid) {
    errors.newPassword = passwordValidation.error!;
  }

  const confirmValidation = validatePasswordConfirmation(newPassword, confirmPassword);
  if (!confirmValidation.isValid) {
    errors.confirmPassword = confirmValidation.error!;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};