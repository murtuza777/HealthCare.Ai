'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { getSupabaseClient, UserProfile, getCurrentUser, getUserProfile } from '../utils/supabase';

interface AuthContextProps {
	user: User | null;
	profile: UserProfile | null;
	isLoading: boolean;
	signOut: () => Promise<void>;
	refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps>({
	user: null,
	profile: null,
	isLoading: true,
	signOut: async () => {},
	refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
	const router = useRouter();
	const [user, setUser] = useState<User | null>(null);
	const [profile, setProfile] = useState<UserProfile | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const supabase = getSupabaseClient();
	const isInitialized = useRef(false);
	const authTimeout = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		// Safety timeout to prevent infinite loading state
		authTimeout.current = setTimeout(() => {
			if (isLoading) {
				console.log('AuthContext: Safety timeout triggered - forcing loading to complete');
				setIsLoading(false);
			}
		}, 5000);

		return () => {
			if (authTimeout.current) {
				clearTimeout(authTimeout.current);
			}
		};
	}, [isLoading]);

	useEffect(() => {
		// Prevent duplicate initialization
		if (isInitialized.current) return;
		isInitialized.current = true;

		const getInitialSession = async () => {
			try {
				console.log('AuthContext: Checking initial auth session');
				setIsLoading(true); // Explicitly set loading state at start
				
				// Check if user is authenticated
				const { data: { session } } = await supabase.auth.getSession();
				
				if (session?.user) {
					console.log('AuthContext: User found in session', session.user.id);
					setUser(session.user);
					
					// Fetch user profile
					try {
						console.log('AuthContext: Fetching user profile');
						const userProfile = await getUserProfile(session.user.id);
						
						if (!userProfile) {
							console.log('AuthContext: No profile found, creating default profile');
							// If no profile exists, we might want to create one
							const { data: profileData, error: profileError } = await supabase
								.from('patients')
								.insert([{ id: session.user.id, email: session.user.email, created_at: new Date().toISOString() }])
								.select()
								.single();
								
							if (profileError) {
								console.error('AuthContext: Error creating default profile:', profileError);
							} else {
								console.log('AuthContext: Created default profile successfully');
								setProfile(profileData);
							}
						} else {
							console.log('AuthContext: Profile found and set');
							setProfile(userProfile);
						}
					} catch (profileError) {
						console.error('AuthContext: Error fetching user profile:', profileError);
						// Still set the user even if profile fetch fails
					}
				} else {
					console.log('AuthContext: No user in session');
					setUser(null);
					setProfile(null);
				}
			} catch (error) {
				console.error('AuthContext: Error checking auth status:', error);
				// Reset user state on error
				setUser(null);
				setProfile(null);
			} finally {
				console.log('AuthContext: Initial auth check complete, setting isLoading to false');
				setIsLoading(false);
			}
		};

		getInitialSession();

		// Set up auth state listener
		const { data: { subscription } } = supabase.auth.onAuthStateChange(
			async (event, session) => {
				console.log('AuthContext: Auth state changed:', event);
				
				if (session?.user) {
					console.log('AuthContext: User authenticated:', session.user.id);
					setUser(session.user);
					
					// Fetch user profile if the user or user ID changed
					if (!user || user.id !== session.user.id) {
						try {
							const userProfile = await getUserProfile(session.user.id);
							console.log('AuthContext: User profile fetched:', userProfile ? 'success' : 'not found');
							setProfile(userProfile);
						} catch (profileError) {
							console.error('AuthContext: Error fetching user profile on auth change:', profileError);
						}
					}
				} else {
					console.log('AuthContext: User not authenticated');
					setUser(null);
					setProfile(null);
				}

				// Update loading state
				setIsLoading(false);

				// Handle auth events
				if (event === 'SIGNED_IN') {
					console.log('AuthContext: User signed in, refreshing router');
					router.refresh();
				}
				if (event === 'SIGNED_OUT') {
					console.log('AuthContext: User signed out, redirecting to login');
					router.push('/auth/login');
				}
			}
		);

		// Cleanup subscription
		return () => {
			console.log('AuthContext: Cleaning up auth subscription');
			subscription?.unsubscribe();
			if (authTimeout.current) {
				clearTimeout(authTimeout.current);
			}
		};
	}, [supabase, router, user]);

	const signOut = async () => {
		console.log('AuthContext: Signing out user');
		await supabase.auth.signOut();
		setUser(null);
		setProfile(null);
		router.push('/auth/login');
	};

	const refreshProfile = async () => {
		if (user) {
			console.log('AuthContext: Refreshing user profile');
			try {
				const userProfile = await getUserProfile(user.id);
				console.log('AuthContext: Profile refreshed:', userProfile ? 'success' : 'not found');
				setProfile(userProfile);
			} catch (error) {
				console.error('AuthContext: Error refreshing profile:', error);
			}
		}
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				profile,
				isLoading,
				signOut,
				refreshProfile,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};