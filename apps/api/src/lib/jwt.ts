import jwt from 'jsonwebtoken'
import type { TokenPayload } from '@myorbislocal/types'
import { getEnv } from '@myorbislocal/config'

const ACCESS_TOKEN_TTL = '15m'

export function signAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, getEnv().AUTH_SECRET, { expiresIn: ACCESS_TOKEN_TTL })
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, getEnv().AUTH_SECRET) as TokenPayload
}
