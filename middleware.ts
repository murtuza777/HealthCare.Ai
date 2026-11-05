import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Next.js only runs middleware from the project root (or src/), not from app/.
// Public: landing page (/), /auth/*, shared report links, and the auth API.

const PUBLIC_PREFIXES = ['/reports/view-shared', '/api/auth'];

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const res = NextResponse.next();

	if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
		return res;
	}

	const supabase = createMiddlewareClient({ req: request, res });

	// Also refreshes an expired session cookie.
	const {
		data: { session },
	} = await supabase.auth.getSession();

	if (!session) {
		if (pathname.startsWith('/api/')) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}
		const loginUrl = new URL('/auth/login', request.url);
		loginUrl.searchParams.set('next', pathname);
		return NextResponse.redirect(loginUrl);
	}

	return res;
}

export const config = {
	matcher: ['/dashboard/:path*', '/reports/:path*', '/api/:path*'],
};
