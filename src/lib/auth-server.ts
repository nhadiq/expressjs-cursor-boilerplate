import type { Request } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '@/lib/auth.js';

export async function getServerSession(req: Request) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  return session;
}
