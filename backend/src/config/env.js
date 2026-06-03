'use strict';

const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_PREFIX: z.string().default('/api'),

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
