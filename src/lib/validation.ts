/**
 * Input validation and sanitization utilities for XSS prevention
 * and general data integrity checks.
 */

const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_PRICE = 1000000000;
const MIN_PRICE = 0;

/**
 * Strip HTML tags and sanitize text input to prevent XSS attacks.
 * Removes script tags, event handlers, and HTML entities.
 */
export function sanitizeText(input: string): string {
  if (!input) return '';
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

/**
 * Sanitize input but preserve basic line breaks for descriptions.
 */
export function sanitizeRichText(input: string): string {
  if (!input) return '';
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/<object[^>]*>.*?<\/object>/gi, '')
    .replace(/<embed[^>]*>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/<[^>]*on\w+[^>]*>/gi, '')
    .trim();
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateTitle(title: string): ValidationResult {
  const errors: string[] = [];
  const sanitized = sanitizeText(title);

  if (!sanitized) {
    errors.push('Title is required');
  }
  if (sanitized.length < 3) {
    errors.push('Title must be at least 3 characters');
  }
  if (sanitized.length > MAX_TITLE_LENGTH) {
    errors.push(`Title must be less than ${MAX_TITLE_LENGTH} characters`);
  }
  if (sanitized !== title) {
    errors.push('Title contains invalid characters');
  }

  return { valid: errors.length === 0, errors };
}

export function validateDescription(description: string): ValidationResult {
  const errors: string[] = [];
  const sanitized = sanitizeRichText(description);

  if (sanitized && sanitized.length > MAX_DESCRIPTION_LENGTH) {
    errors.push(`Description must be less than ${MAX_DESCRIPTION_LENGTH} characters`);
  }
  if (sanitized !== description) {
    errors.push('Description contains invalid content');
  }

  return { valid: errors.length === 0, errors };
}

export function validatePrice(price: string, priceType: string): ValidationResult {
  const errors: string[] = [];

  if (priceType === 'free') {
    return { valid: true, errors: [] };
  }

  if (!price && priceType !== 'free') {
    errors.push('Price is required');
    return { valid: false, errors };
  }

  const numPrice = parseFloat(price);
  if (isNaN(numPrice)) {
    errors.push('Price must be a valid number');
  } else {
    if (numPrice < MIN_PRICE) {
      errors.push('Price cannot be negative');
    }
    if (numPrice > MAX_PRICE) {
      errors.push('Price is too high');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email) {
    errors.push('Email is required');
  } else if (!emailRegex.test(email)) {
    errors.push('Invalid email format');
  }

  return { valid: errors.length === 0, errors };
}

export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];

  if (!password) {
    errors.push('Password is required');
  } else {
    if (password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }
    if (password.length > 128) {
      errors.push('Password must be less than 128 characters');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validatePhone(phone: string): ValidationResult {
  const errors: string[] = [];
  const phoneRegex = /^\+?[0-9\s\-()]{6,20}$/;

  if (phone && !phoneRegex.test(phone)) {
    errors.push('Invalid phone number format');
  }

  return { valid: errors.length === 0, errors };
}

export function validateLocation(division: string, district: string): ValidationResult {
  const errors: string[] = [];

  if (!division) {
    errors.push('Division is required');
  }
  if (!district) {
    errors.push('District is required');
  }

  return { valid: errors.length === 0, errors };
}

export function validateImageFile(file: File): ValidationResult {
  const errors: string[] = [];
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(file.type)) {
    errors.push('Only JPEG, PNG, WebP, and GIF images are allowed');
  }
  if (file.size > maxSize) {
    errors.push('Image must be less than 5MB');
  }

  return { valid: errors.length === 0, errors };
}

export function validateUrl(url: string): ValidationResult {
  const errors: string[] = [];

  if (!url) {
    errors.push('URL is required');
  } else {
    try {
      new URL(url);
    } catch {
      errors.push('Invalid URL format');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateSlug(slug: string): ValidationResult {
  const errors: string[] = [];
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  if (!slug) {
    errors.push('Slug is required');
  } else if (!slugRegex.test(slug)) {
    errors.push('Slug must be lowercase with hyphens only');
  }

  return { valid: errors.length === 0, errors };
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

export function sanitizeSearchQuery(query: string): string {
  if (!query) return '';
  return query
    .replace(/[<>]/g, '')
    .replace(/[';]/g, '')
    .trim()
    .slice(0, 200);
}

export { MAX_TITLE_LENGTH, MAX_DESCRIPTION_LENGTH, MAX_PRICE, MIN_PRICE };
