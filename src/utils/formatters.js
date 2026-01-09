/**
 * Formatting utilities for the Contract Management App
 * Consistent formatting across all components
 */

/**
 * Format a date for display
 * @param {string|Date} date - Date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @param {string} locale - Locale string (defaults to browser locale)
 * @returns {string} Formatted date string
 */
export const formatDate = (date, options = {}, locale = undefined) => {
  if (!date) return '-';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) return '-';
    
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options
    };
    
    return new Intl.DateTimeFormat(locale, defaultOptions).format(dateObj);
  } catch (error) {
    console.error('Date formatting error:', error);
    return '-';
  }
};

/**
 * Format a date with time
 * @param {string|Date} date - Date to format
 * @param {string} locale - Locale string
 * @returns {string} Formatted date-time string
 */
export const formatDateTime = (date, locale = undefined) => {
  return formatDate(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }, locale);
};

/**
 * Format a date as relative time (e.g., "2 days ago")
 * @param {string|Date} date - Date to format
 * @param {string} locale - Locale string
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (date, locale = undefined) => {
  if (!date) return '-';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '-';
    
    const now = new Date();
    const diffMs = now - dateObj;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);
    
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    
    if (diffSeconds < 60) return rtf.format(-diffSeconds, 'second');
    if (diffMinutes < 60) return rtf.format(-diffMinutes, 'minute');
    if (diffHours < 24) return rtf.format(-diffHours, 'hour');
    if (diffDays < 7) return rtf.format(-diffDays, 'day');
    if (diffWeeks < 4) return rtf.format(-diffWeeks, 'week');
    if (diffMonths < 12) return rtf.format(-diffMonths, 'month');
    return rtf.format(-diffYears, 'year');
  } catch (error) {
    console.error('Relative time formatting error:', error);
    return formatDate(date, {}, locale);
  }
};

/**
 * Format file size in human-readable format
 * @param {number} bytes - File size in bytes
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted file size (e.g., "1.5 MB")
 */
export const formatFileSize = (bytes, decimals = 2) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
};

/**
 * Format a number as currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @param {string} locale - Locale string
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'USD', locale = 'en-US') => {
  if (amount === null || amount === undefined) return '-';
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(amount);
  } catch (error) {
    console.error('Currency formatting error:', error);
    return `${currency} ${amount}`;
  }
};

/**
 * Format a number with thousand separators
 * @param {number} number - Number to format
 * @param {string} locale - Locale string
 * @returns {string} Formatted number string
 */
export const formatNumber = (number, locale = undefined) => {
  if (number === null || number === undefined) return '-';
  
  return new Intl.NumberFormat(locale).format(number);
};

/**
 * Format a percentage
 * @param {number} value - Value to format (0-100 or 0-1)
 * @param {number} decimals - Number of decimal places
 * @param {boolean} isDecimal - Whether value is already decimal (0-1)
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value, decimals = 1, isDecimal = false) => {
  if (value === null || value === undefined) return '-';
  
  const percentage = isDecimal ? value * 100 : value;
  return `${percentage.toFixed(decimals)}%`;
};

/**
 * Format a phone number
 * @param {string} phone - Phone number to format
 * @param {string} format - Format pattern (default: international)
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phone, format = 'international') => {
  if (!phone) return '-';
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 10) {
    // US format: (XXX) XXX-XXXX
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits[0] === '1') {
    // US with country code: +1 (XXX) XXX-XXXX
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  
  return phone; // Return as-is if format unknown
};

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add (default: ...)
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 50, suffix = '...') => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  return text.slice(0, maxLength - suffix.length).trim() + suffix;
};

/**
 * Format a file name for display (truncate middle if too long)
 * @param {string} filename - File name to format
 * @param {number} maxLength - Maximum length
 * @returns {string} Formatted file name
 */
export const formatFileName = (filename, maxLength = 30) => {
  if (!filename) return '';
  if (filename.length <= maxLength) return filename;
  
  const extension = filename.lastIndexOf('.') > 0 
    ? filename.slice(filename.lastIndexOf('.')) 
    : '';
  const name = filename.slice(0, filename.length - extension.length);
  
  const availableLength = maxLength - extension.length - 3; // 3 for "..."
  const halfLength = Math.floor(availableLength / 2);
  
  return `${name.slice(0, halfLength)}...${name.slice(-halfLength)}${extension}`;
};

/**
 * Get days until expiry
 * @param {string|Date} expiryDate - Expiry date
 * @returns {number|null} Days until expiry (negative if expired)
 */
export const getDaysUntilExpiry = (expiryDate) => {
  if (!expiryDate) return null;
  
  try {
    const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
    if (isNaN(expiry.getTime())) return null;
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    
    const diffMs = expiry - now;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  } catch (error) {
    console.error('Days until expiry calculation error:', error);
    return null;
  }
};

/**
 * Format days until expiry for display
 * @param {string|Date} expiryDate - Expiry date
 * @returns {object} { days, label, isExpired, isExpiring }
 */
export const formatExpiryStatus = (expiryDate, threshold = 14) => {
  const days = getDaysUntilExpiry(expiryDate);
  
  if (days === null) {
    return { days: null, label: 'No expiry', isExpired: false, isExpiring: false };
  }
  
  if (days < 0) {
    return { days, label: `Expired ${Math.abs(days)} days ago`, isExpired: true, isExpiring: false };
  }
  
  if (days === 0) {
    return { days, label: 'Expires today', isExpired: false, isExpiring: true };
  }
  
  if (days === 1) {
    return { days, label: 'Expires tomorrow', isExpired: false, isExpiring: true };
  }
  
  if (days <= threshold) {
    return { days, label: `Expires in ${days} days`, isExpired: false, isExpiring: true };
  }
  
  return { days, label: `${days} days remaining`, isExpired: false, isExpiring: false };
};

/**
 * Capitalize first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Convert camelCase or snake_case to Title Case
 * @param {string} str - String to convert
 * @returns {string} Title case string
 */
export const toTitleCase = (str) => {
  if (!str) return '';
  return str
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
};

/**
 * Return a translated string when an i18n key field exists on an object,
 * otherwise return a fallback string field.
 * @param {Function} t - i18next translation function
 * @param {object} obj - object containing i18n and fallback fields
 * @param {string} i18nField - name of the field that holds the i18n key (e.g. 'title_i18n')
 * @param {string} fallbackField - name of the fallback field (e.g. 'title')
 * @returns {string}
 */
export const getI18nOrFallback = (t, obj = {}, i18nField = 'title_i18n', fallbackField = 'title') => {
  if (!t) return obj[fallbackField] || '';
  const key = obj && obj[i18nField];
  if (key) return t(key, obj[fallbackField] || '');
  return obj[fallbackField] || '';
};
