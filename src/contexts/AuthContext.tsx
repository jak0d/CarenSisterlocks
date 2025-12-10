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
    resetPassword: (email: string) => Promise<void>;
    updatePassword: (password: string) => Promise<void>;
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

    // Real-time subscription for worker status changes
    useEffect(() => {
        if (!user || user.role !== 'worker') return;

        console.log('Setting up real-time subscription for worker status changes...');

        // Subscribe to changes on the workers table for this specific user
        const channel = supabase
            .channel('worker-status-changes')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'workers',
                    filter: `user_id=eq.${user.id}`,
                },
                async (payload) => {
                    console.log('Worker status changed:', payload);
                    const newStatus = (payload.new as any)?.is_active;

                    if (newStatus !== undefined && newStatus !== user.is_active) {
                        // Update the user's is_active status
                        setUser(prev => prev ? { ...prev, is_active: newStatus } : null);

                        // If worker was deactivated, sign them out
                        if (newStatus === false) {
                            console.log('Worker deactivated, signing out...');
                            await signOut();
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            console.log('Cleaning up real-time subscription...');
            supabase.removeChannel(channel);
        };
    }, [user?.id, user?.role]);

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

            // If user is a worker, check their status
            let isActive = true;
            if (data.role === 'worker') {
                try {
                    // Try to use the secure RPC function first (bypasses RLS)
                    const { data: statusData, error: rpcError } = await supabase
                        .rpc('get_my_worker_status');

                    if (!rpcError) {
                        // If RPC succeeds, use the result
                        // statusData is boolean (true/false) or null (if not found)
                        if (statusData === null) {
                            isActive = false; // Worker profile deleted
                        } else {
                            isActive = statusData;
                        }
                    } else {
                        // Fallback to direct table query if RPC doesn't exist yet
                        console.warn('RPC get_my_worker_status failed, falling back to direct query:', rpcError);

                        const { data: workerData, error: workerError } = await supabase
                            .from('workers')
                            .select('is_active')
                            .eq('user_id', authUser.id)
                            .maybeSingle();

                        if (workerError) {
                            console.error('Error fetching worker status:', workerError);
                        }

                        // If worker profile exists, use its status. If not (deleted or hidden by RLS), they are inactive.
                        if (!workerData) {
                            isActive = false;
                        } else {
                            isActive = workerData.is_active;
                        }
                    }
                } catch (err) {
                    console.error('Error in worker status check:', err);
                    // Default to false if we can't verify
                    isActive = false;
                }
            }

            console.log('User profile loaded successfully:', { id: data.id, email: data.email, role: data.role, isActive });

            // Set the user with is_active flag
            setUser({ ...data, is_active: isActive } as AuthUser);
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

    const resetPassword = async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/update-password`,
        });
        if (error) throw error;
    };

    const updatePassword = async (password: string) => {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
    };

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, resetPassword, updatePassword }}>
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
