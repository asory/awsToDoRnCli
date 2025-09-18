import {
  validateEmail,
  validatePassword,
  validateCognitoPassword,
  validatePasswordConfirmation,
  validateResetCode,
  validateRequired,
  validateMinLength,
  validateRegistrationForm,
  validateResetPasswordForm,
} from '../src/shared/utils/validation';

describe('validation', () => {
  describe('validateEmail', () => {
    it('should return valid for correct email', () => {
      const result = validateEmail('test@example.com');
      expect(result.isValid).toBe(true);
    });

    it('should return invalid for empty email', () => {
      const result = validateEmail('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email is required');
    });

    it('should return invalid for malformed email', () => {
      const result = validateEmail('invalid-email');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email is invalid');
    });
  });

  describe('validatePassword', () => {
    it('should return valid for strong password with default options', () => {
      const result = validatePassword('StrongPass1!');
      expect(result.isValid).toBe(true);
    });

    it('should return invalid for empty password', () => {
      const result = validatePassword('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password is required');
    });

    it('should return invalid for short password', () => {
      const result = validatePassword('Short1!');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password must be at least 8 characters long');
    });

    it('should return invalid without lowercase', () => {
      const result = validatePassword('STRONGPASS1!');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        'Password must contain at least one lowercase letter',
      );
    });

    it('should return invalid without uppercase', () => {
      const result = validatePassword('strongpass1!');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        'Password must contain at least one uppercase letter',
      );
    });

    it('should return invalid without numbers', () => {
      const result = validatePassword('StrongPass!');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password must contain at least one number');
    });

    it('should return invalid without symbols', () => {
      const result = validatePassword('StrongPass1');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        'Password must contain at least one special character',
      );
    });

    it('should validate with custom options', () => {
      const result = validatePassword('Weak1', {
        minLength: 4,
        requireSymbols: false,
      });
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateCognitoPassword', () => {
    it('should validate according to Cognito requirements', () => {
      const result = validateCognitoPassword('ValidPass1!');
      expect(result.isValid).toBe(true);
    });

    it('should invalidate weak password', () => {
      const result = validateCognitoPassword('weak');
      expect(result.isValid).toBe(false);
    });
  });

  describe('validatePasswordConfirmation', () => {
    it('should return valid when passwords match', () => {
      const result = validatePasswordConfirmation('password123', 'password123');
      expect(result.isValid).toBe(true);
    });

    it('should return invalid for empty confirmation', () => {
      const result = validatePasswordConfirmation('password123', '');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please confirm your password');
    });

    it('should return invalid when passwords do not match', () => {
      const result = validatePasswordConfirmation('password123', 'different');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Passwords do not match');
    });
  });

  describe('validateResetCode', () => {
    it('should return valid for 6-digit code', () => {
      const result = validateResetCode('123456');
      expect(result.isValid).toBe(true);
    });

    it('should return invalid for empty code', () => {
      const result = validateResetCode('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Reset code is required');
    });

    it('should return invalid for short code', () => {
      const result = validateResetCode('12345');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Reset code must be 6 digits');
    });

    it('should return invalid for non-numeric code', () => {
      const result = validateResetCode('12a456');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Reset code must contain only numbers');
    });
  });

  describe('validateRequired', () => {
    it('should return valid for non-empty string', () => {
      const result = validateRequired('value', 'Field');
      expect(result.isValid).toBe(true);
    });

    it('should return invalid for empty string', () => {
      const result = validateRequired('', 'Field');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Field is required');
    });

    it('should return invalid for whitespace only', () => {
      const result = validateRequired('   ', 'Field');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Field is required');
    });
  });

  describe('validateMinLength', () => {
    it('should return valid for sufficient length', () => {
      const result = validateMinLength('longenough', 5, 'Field');
      expect(result.isValid).toBe(true);
    });

    it('should return invalid for insufficient length', () => {
      const result = validateMinLength('short', 10, 'Field');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Field must be at least 10 characters long');
    });
  });

  describe('validateRegistrationForm', () => {
    it('should return valid for correct inputs', () => {
      const result = validateRegistrationForm(
        'test@example.com',
        'StrongPass1!',
        'StrongPass1!',
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should return errors for invalid inputs', () => {
      const result = validateRegistrationForm('invalid', 'weak', 'different');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveProperty('email');
      expect(result.errors).toHaveProperty('password');
      expect(result.errors).toHaveProperty('confirmPassword');
    });
  });

  describe('validateResetPasswordForm', () => {
    it('should return valid for correct inputs', () => {
      const result = validateResetPasswordForm(
        '123456',
        'StrongPass1!',
        'StrongPass1!',
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should return errors for invalid inputs', () => {
      const result = validateResetPasswordForm('12a', 'weak', 'different');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveProperty('code');
      expect(result.errors).toHaveProperty('newPassword');
      expect(result.errors).toHaveProperty('confirmPassword');
    });
  });
});
