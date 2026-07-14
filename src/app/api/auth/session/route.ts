import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    
    if (!token) {
      return NextResponse.json({ authenticated: false, error: 'No token found' }, { status: 401 });
    }
    
    const user = getUserFromToken(token) as any;
    
    if (!user) {
      return NextResponse.json({ authenticated: false, error: 'Invalid token' }, { status: 401 });
    }
    
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Session API error:', error);
    return NextResponse.json({ authenticated: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
