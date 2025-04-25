import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
	const res = NextResponse.next();
	const supabase = createMiddlewareClient({ req: request, res });

	// Refresh session if expired - required for Server Components
	await supabase.auth.getSession();

	const {
		data: { session },
	} = await supabase.auth.getSession();

	// If no session and trying to access protected routes
	if (!session && !request.nextUrl.pathname.startsWith('/auth')) {
		return NextResponse.redirect(new URL('/auth/login', request.url));
	}

	return res;
}

export const config = {
	matcher: [
		'/dashboard/:path*',
		'/api/:path*',
		'/((?!auth|_next/static|_next/image|favicon.ico).*)',
	],
};