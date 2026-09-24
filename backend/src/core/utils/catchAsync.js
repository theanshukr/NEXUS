/**
 * Wraps async route handlers to automatically pass rejected promises to Express next()
 */
export const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
