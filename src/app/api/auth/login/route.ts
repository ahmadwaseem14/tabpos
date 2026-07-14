import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyPassword, signToken, getCookieConfig } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }
    
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase().trim() },
    });
    
    if (!user) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }
    
    const isPasswordValid = await verifyPassword(password, user.password);
    
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }
    
    const tokenPayload = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role
    };
    
    const token = signToken(tokenPayload);
    const cookie = getCookieConfig();
    
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
    
    // Set the cookie
    response.cookies.set(cookie.name, token, cookie.options);
    
    // Log the audit event
    await prisma.auditLog.create({
      data: {
        type: 'SYSTEM',
        details: `User ${user.username} logged in successfully.`
      }
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
