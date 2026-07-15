import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

/** Global HTTP hardening for Express. */
export function applySecurity(app) {
  app.disable('x-powered-by');
  if (process.env.TRUST_PROXY === '1' || process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  app.use('/api/', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.API_RATE_LIMIT || 800),
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests. Please slow down and try again.' },
  }));
}

/** Stricter limiter for login / register / password change. */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT || 25),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many auth attempts. Please wait 15 minutes and try again.' },
});

/** Strip common NoSQL operator injection keys from body/query. */
export function sanitizeInput(req, _res, next) {
  const clean = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
        continue;
      }
      if (typeof obj[key] === 'object') clean(obj[key]);
    }
  };
  clean(req.body);
  clean(req.query);
  clean(req.params);
  next();
}
