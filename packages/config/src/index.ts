import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_NAME: z.string().default('APP_NAME'),
  APP_BASE_URL: z.string().url(),
  API_BASE_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters'),
  SESSION_COOKIE_NAME: z.string().default('template_session'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_STARTER_MONTHLY: z.string().optional(),
  STRIPE_PRICE_PRO_MONTHLY: z.string().optional(),
  STRIPE_PRICE_ENTERPRISE_MONTHLY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  TRANSACTIONAL_EMAIL_PROVIDER: z.string().optional(),
  TRANSACTIONAL_EMAIL_API_KEY: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  ENABLE_AFFILIATES: z.string().transform((v) => v === 'true').default('true'),
})

export type Env = z.infer<typeof envSchema>

let _env: Env | undefined

export function getEnv(): Env {
  if (!_env) {
    const result = envSchema.safeParse(process.env)
    if (!result.success) {
      console.error('[config] Invalid environment:')
      for (const issue of result.error.issues) {
        console.error(`  ${issue.path.join('.')}: ${issue.message}`)
      }
      process.exit(1)
    }
    _env = result.data
  }
  return _env as Env
}

export { envSchema }
