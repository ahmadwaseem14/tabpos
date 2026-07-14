import { NextRequest, NextResponse } from 'next/server';
import { getCookieConfig } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const cookie = getCookieConfig();
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  
  // Expire the cookie immediately
  response.cookies.set(cookie.name, '', { ...cookie.options, maxAge: 0 });
  
  return response;
}
