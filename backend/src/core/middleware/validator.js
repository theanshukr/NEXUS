import { ValidationError } from '#@/core/errors/AppError.js';

/**
 * Middleware factory for validating HTTP request data against Zod schemas.
 * @param {import('zod').ZodSchema} schema 
 */
export const validate = (schema) => {
  return async (req, res, next) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });

      // Override req object with sanitized & validated Zod output
      if (parsed.body) req.body = parsed.body;
      if (parsed.query) Object.assign(req.query, parsed.query);
      if (parsed.params) Object.assign(req.params, parsed.params);

      next();
    } catch (error) {
      if (error.name === 'ZodError') {
        // Zod v4 uses `.issues`; v3 used `.errors`
        const details = (error.issues || error.errors || []).map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        next(new ValidationError('Request input validation failed.', 400, 'ERR_VALIDATION', details));
      } else {
        next(error);
      }
    }
  };
};

export default validate;
