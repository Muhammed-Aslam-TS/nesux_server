/**
 * Generic helper to validate that required fields are present and non-empty.
 * Handles strings (non-empty), arrays (non-empty), objects (non-empty), and other types (non-null/undefined).
 * 
 * @param {Object} fields - Key-value pairs of the fields to check.
 * @returns {Object} Validation result { isValid: boolean, message: string, missing: string[] }
 */
export const validateRequiredFields = (fields) => {
  const missingFields = [];

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) {
      missingFields.push(key);
      continue;
    }

    if (typeof value === "string" && value.trim() === "") {
      missingFields.push(key);
      continue;
    }

    if (Array.isArray(value) && value.length === 0) {
      missingFields.push(key);
      continue;
    }

    // Check for empty object (e.g., {}) but exclude instances like Date
    if (
      typeof value === "object" &&
      !(value instanceof Date) &&
      Object.keys(value).length === 0
    ) {
      missingFields.push(key);
      continue;
    }
  }

  if (missingFields.length > 0) {
    return {
      isValid: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
      missing: missingFields,
    };
  }

  return { isValid: true };
};
