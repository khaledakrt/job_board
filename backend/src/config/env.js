'use strict';

const { z } = require('zod');

const WEAK_SECRET_PATTERNS = [
  /change[_-]?me/i,
  /placeholder/i,
  /your[_-]?/i,
  /example/i,
  /default/i,
  /secret/i,
  /password/i,
];

function isWeakProductionSecret(value) {
  if (!value || typeof value !== 'string') {
    return true;
  }

  const normalized = value.trim();
  if (normalized.length < 16) {
    return true;
  }

  return WEAK_SECRET_PATTERNS.some((pattern) => pattern.test(normalized));
}

function addProductionSecretIssue(ctx, key, message = `${key} must be set to a real production value`) {
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path: [key],
    message,
  });
}

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    API_PREFIX: z.string().default('/api'),
  TRUST_PROXY: z.string().default('1'),
  ENABLE_SCHEDULER: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),

  CLIENT_URL: z.string().url(),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string(),
  DB_POOL_MAX: z.coerce.number().int().nonnegative().default(10),
  DB_POOL_MIN: z.coerce.number().int().nonnegative().default(0),
  DB_POOL_ACQUIRE: z.coerce.number().int().positive().default(30000),
  DB_POOL_IDLE: z.coerce.number().int().positive().default(10000),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  PASSWORD_RESET_EXPIRES_HOURS: z.coerce.number().int().positive().default(1),
  EMAIL_VERIFICATION_EXPIRES_HOURS: z.coerce.number().int().positive().default(48),

  COOKIE_SECURE: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('strict'),

  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  GLOBAL_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  GLOBAL_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),

  API_PUBLIC_URL: z.string().url().default('http://localhost:3000'),
  UPLOAD_DIR: z.string().default('uploads'),

  SUBSCRIPTION_MOCK_BYPASS: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),

  SMTP_HOST: z.string().min(1).default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM_NAME: z.string().default('Job Board'),
  SMTP_FROM_EMAIL: z.string().email().default('noreply@jobboard.local'),
  CONTACT_TO_EMAIL: z.string().email().default('khaliid.akrout@gmail.com'),

  /** off = gratuit (heuristique) | ollama = gratuit local | openai = API payante */
  CV_LLM_PROVIDER: z.enum(['off', 'ollama', 'openai']).default('off'),

  OPENAI_API_KEY: z
    .string()
    .optional()
    .transform((val) => {
      const trimmed = val?.trim();
      return trimmed && trimmed.length > 0 ? trimmed : undefined;
    }),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),

  OLLAMA_BASE_URL: z.string().url().default('http://127.0.0.1:11434'),
  OLLAMA_MODEL: z.string().default('llama3.2'),
    OLLAMA_CV_TIMEOUT_MS: z.coerce.number().int().positive().default(90000),
  })
  .superRefine((env, ctx) => {
    if (env.COOKIE_SAME_SITE === 'none' && !env.COOKIE_SECURE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['COOKIE_SECURE'],
        message: 'COOKIE_SECURE=true is required when COOKIE_SAME_SITE=none',
      });
    }

    if (env.NODE_ENV !== 'production') {
      return;
    }

    const requiredProductionSecrets = [
      ['DB_PASSWORD', env.DB_PASSWORD],
      ['JWT_ACCESS_SECRET', env.JWT_ACCESS_SECRET],
      ['JWT_REFRESH_SECRET', env.JWT_REFRESH_SECRET],
      ['SMTP_PASS', env.SMTP_PASS],
    ];

    for (const [key, value] of requiredProductionSecrets) {
      if (isWeakProductionSecret(value)) {
        addProductionSecretIssue(ctx, key);
      }
    }

    if (env.JWT_ACCESS_SECRET.length < 64) {
      addProductionSecretIssue(ctx, 'JWT_ACCESS_SECRET', 'JWT_ACCESS_SECRET must be at least 64 characters in production');
    }

    if (env.JWT_REFRESH_SECRET.length < 64) {
      addProductionSecretIssue(ctx, 'JWT_REFRESH_SECRET', 'JWT_REFRESH_SECRET must be at least 64 characters in production');
    }

    if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
      addProductionSecretIssue(ctx, 'JWT_REFRESH_SECRET', 'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different');
    }

    if (!env.CLIENT_URL.startsWith('https://') || !env.API_PUBLIC_URL.startsWith('https://')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CLIENT_URL'],
        message: 'CLIENT_URL and API_PUBLIC_URL must use HTTPS in production',
      });
    }

    if (!env.COOKIE_SECURE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['COOKIE_SECURE'],
        message: 'COOKIE_SECURE=true is required in production',
      });
    }

    if (env.SUBSCRIPTION_MOCK_BYPASS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SUBSCRIPTION_MOCK_BYPASS'],
        message: 'SUBSCRIPTION_MOCK_BYPASS must be false in production',
      });
    }
  });

/** Map EMAIL_USER / EMAIL_PASS (autres projets) → SMTP_* ; mot de passe Gmail sans espaces. */
function normalizeSmtpEnv(raw) {
  const env = { ...raw };
  if (!env.SMTP_USER && env.EMAIL_USER) {
    env.SMTP_USER = env.EMAIL_USER;
  }
  if (!env.SMTP_PASS && env.EMAIL_PASS) {
    env.SMTP_PASS = String(env.EMAIL_PASS).replace(/\s+/g, '');
  }
  if (env.EMAIL_USER && !raw.SMTP_HOST) {
    env.SMTP_HOST = 'smtp.gmail.com';
    env.SMTP_PORT = env.SMTP_PORT || '587';
  }
  if (!env.SMTP_FROM_EMAIL && env.SMTP_USER) {
    env.SMTP_FROM_EMAIL = env.SMTP_USER;
  }
  return env;
}

function loadEnv() {
  const parsed = envSchema.safeParse(normalizeSmtpEnv(process.env));

  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${formatted}`);
  }

  return parsed.data;
}

module.exports = { loadEnv };
