import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { prisma } from './prisma';

const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET || 'fallback-secret-for-dev-tripmate-2026';
  return new TextEncoder().encode(secret);
};

export const TOKEN_COOKIE_NAME = 'tripmate_token';

export async function signToken(payload: Record<string, unknown>, expiresIn = '7d') {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getJwtSecretKey());
}

export async function verifyToken(token: string) {
  try {
    const verified = await jwtVerify(token, getJwtSecretKey());
    return verified.payload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(req?: NextRequest | Request) {
  let token: string | undefined;

  if (req && 'cookies' in req && typeof (req as NextRequest).cookies?.get === 'function') {
    token = (req as NextRequest).cookies.get(TOKEN_COOKIE_NAME)?.value;
  }

  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
    } catch {
      // ignore if outside request context
    }
  }

  if (!token && req) {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload || typeof payload.userId !== 'string') return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      upiId: true,
      travelStyle: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}
