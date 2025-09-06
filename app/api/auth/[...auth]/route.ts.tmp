import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

interface AuthRequest {
  email: string;
  password: string;
  name?: string;
  provider?: string;
  action?: string;
  accessToken?: string;
  refreshToken?: string;
}

export async function POST(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const formData = await request.json() as AuthRequest;
  const supabase = createRouteHandlerClient({ cookies });
  const { action } = formData;

  try {
    switch (action) {
      case 'signin': {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 401 });
        }

        return NextResponse.json({ user: data.user, session: data.session });
      }

      case 'signup': {
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              name: formData.name,
            },
          },
        });

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ user: data.user, session: data.session });
      }

      case 'signout': {
        const { error } = await supabase.auth.signOut();

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ message: 'Signed out successfully' });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const supabase = createRouteHandlerClient({ cookies });

  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
