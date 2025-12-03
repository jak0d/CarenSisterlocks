import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { AuthUser } from '../types/index';

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, fullName: string, role: 'client' | 'worker' | 'admin') => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                fetchUserProfile(session.user);
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                fetchUserProfile(session.user);
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchUserProfile = async (authUser: User, retryCount = 0) => {
        const MAX_RETRIES = 3;
        const RETRY_DELAY = 1000; // 1 second

        try {
            // Use maybeSingle() instead of single() to avoid 406 errors
            // RLS policies will automatically filter to show only the user's own profile
            const { data, error } = await supabase
                .from('users')
                .select('id, email, full_name, role')
                .eq('id', authUser.id)
                .maybeSingle();

            if (error) {
                console.error('Error fetching user profile:', error);
                throw error;
            }

            if (!data) {
                // User profile doesn't exist yet, might be during signup
                // Retry a few times to give the trigger time to create the profile
                if (retryCount < MAX_RETRIES) {
                    console.warn(`User profile not found, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
                    setTimeout(() => {
                        fetchUserProfile(authUser, retryCount + 1);
                    }, RETRY_DELAY);
                    return;
                } else {
                    console.error('User profile not found after maximum retries. This might indicate a database trigger issue.');
                    setUser(null);
                    setLoading(false);
                    return;
                }
            }

            console.log('User profile loaded successfully:', { id: data.id, email: data.email, role: data.role });
            setUser(data as AuthUser);
            setLoading(false);
        } catch (error: any) {
            console.error('Error fetching user profile:', error);
            setUser(null);
            setLoading(false);
        }
    };

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
    };

    const signUp = async (email: string, password: string, fullName: string, role: 'client' | 'worker' | 'admin') => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    role: role,
                },
            },
        });

        if (error) throw error;
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
