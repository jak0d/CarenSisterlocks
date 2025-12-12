import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, CheckCircle, XCircle, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

export default function GoogleOAuthCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, loading } = useAuth();
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [message, setMessage] = useState('Processing Google Calendar connection...');
    const [hasProcessed, setHasProcessed] = useState(false);

    // Parse the state parameter to get user info if user is not loaded yet
    const getStateData = () => {
        try {
            const stateParam = searchParams.get('state');
            if (stateParam) {
                return JSON.parse(atob(stateParam));
            }
        } catch (e) {
            console.error('Failed to parse state parameter:', e);
        }
        return null;
    };

    useEffect(() => {
        // Wait for auth to finish loading before processing
        if (loading) {
            console.log('⏳ Waiting for auth to load...');
            return;
        }

        // Only process once
        if (hasProcessed) {
            return;
        }

        // Get user info from auth context or state parameter
        const stateData = getStateData();
        const userId = user?.id || stateData?.user_id;
        const userRole = user?.role || stateData?.role;

        console.log('🔐 Auth loaded. User:', user?.id, 'State data:', stateData);

        if (!userId || !userRole) {
            console.error('❌ No user found and no valid state parameter');
            setStatus('error');
            setMessage('Session expired. Please log in and try connecting again.');
            return;
        }

        setHasProcessed(true);
        handleOAuthCallback(userId, userRole);
    }, [loading, hasProcessed]);

    const handleOAuthCallback = async (userId: string, userRole: string) => {
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const state = searchParams.get('state');

        if (error) {
            setStatus('error');
            setMessage(`Authorization failed: ${error}`);
            toast.error('Failed to connect Google Calendar');
            return;
        }

        if (!code) {
            setStatus('error');
            setMessage('No authorization code received');
            toast.error('Failed to connect Google Calendar');
            return;
        }

        try {
            // Exchange code for tokens via Supabase Edge Function
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            console.log('🔄 Starting Google Calendar OAuth token exchange...');
            console.log('Supabase URL:', supabaseUrl);
            console.log('User ID:', userId);
            console.log('User Role:', userRole);

            setMessage('Exchanging authorization code for tokens...');

            const response = await fetch(`${supabaseUrl}/functions/v1/google-calendar-auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify({
                    code,
                    redirect_uri: `${window.location.origin}/oauth/google/callback`,
                    user_id: userId,
                    user_role: userRole,
                    state,
                }),
            });

            console.log('📡 Edge Function response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Edge Function error response:', errorText);

                let errorMessage = 'Failed to connect Google Calendar';

                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error || errorData.message || errorMessage;

                    // Show detailed Google OAuth error
                    if (errorData.details) {
                        const detailedError = errorData.details.error_description || errorData.details.error || '';
                        console.error('🔍 Google OAuth Error Details:', errorData.details, detailedError);

                        // Provide helpful messages for common errors
                        if (errorData.details.error === 'invalid_grant') {
                            if (errorData.details.error_description?.includes('expired')) {
                                errorMessage = 'Authorization code expired. Please try connecting again.';
                            } else if (errorData.details.error_description?.includes('Malformed')) {
                                errorMessage = 'Invalid authorization code. Please try connecting again.';
                            } else if (errorData.details.error_description?.includes('redirect_uri')) {
                                errorMessage = 'Redirect URI mismatch. Check Google Cloud Console settings.';
                            } else {
                                errorMessage = `OAuth Error: ${errorData.details.error_description || 'Invalid grant'}. Please try connecting again.`;
                            }
                        }
                    }

                    // Check if Edge Function is not deployed
                    if (response.status === 404) {
                        errorMessage = 'Google Calendar Edge Function is not deployed. Please deploy the Supabase Edge Functions first.';
                    }
                } catch (e) {
                    if (response.status === 404) {
                        errorMessage = 'Google Calendar Edge Function is not deployed. Please deploy the Supabase Edge Functions first.';
                    }
                }

                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log('✅ Token exchange successful. Calendar ID:', data.calendar_id);

            setMessage('Saving calendar connection...');

            // Update the worker/admin calendar connection status
            if (userRole === 'worker') {
                console.log('💾 Updating worker calendar connection...');
                const { error: updateError, data: updateData } = await supabase
                    .from('workers')
                    .update({
                        google_calendar_id: data.calendar_id,
                        google_access_token: data.access_token,
                        google_refresh_token: data.refresh_token,
                        calendar_connected: true,
                    })
                    .eq('user_id', userId)
                    .select();

                if (updateError) {
                    console.error('❌ Worker update error:', updateError);
                    throw updateError;
                }
                console.log('✅ Worker calendar connection saved:', updateData);
            } else if (userRole === 'admin') {
                // For admin, store in system_settings
                console.log('💾 Updating admin calendar connection...');
                const { error: updateError, data: updateData } = await supabase
                    .from('system_settings')
                    .upsert({
                        key: 'google_calendar_admin',
                        value: {
                            calendar_id: data.calendar_id,
                            access_token: data.access_token,
                            refresh_token: data.refresh_token,
                            connected: true,
                            connected_at: new Date().toISOString(),
                            connected_by: userId,
                        },
                    })
                    .select();

                if (updateError) {
                    console.error('❌ Admin settings update error:', updateError);
                    throw updateError;
                }
                console.log('✅ Admin calendar connection saved:', updateData);
            }

            setStatus('success');
            setMessage('Google Calendar connected successfully!');
            toast.success('Google Calendar connected!');

            // Redirect after a short delay with cache-busting
            setTimeout(() => {
                if (userRole === 'admin') {
                    // Force refresh by adding a timestamp parameter
                    navigate('/admin/settings?refresh=' + Date.now());
                } else if (userRole === 'worker') {
                    navigate('/worker?refresh=' + Date.now());
                } else {
                    navigate('/');
                }
            }, 2000);

        } catch (err: any) {
            console.error('❌ OAuth callback error:', err);
            setStatus('error');
            setMessage(err.message || 'Failed to connect Google Calendar');
            toast.error(err.message || 'Failed to connect Google Calendar');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${status === 'processing' ? 'bg-blue-100' :
                    status === 'success' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                    {status === 'processing' && (
                        <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
                    )}
                    {status === 'success' && (
                        <CheckCircle className="h-10 w-10 text-green-600" />
                    )}
                    {status === 'error' && (
                        <XCircle className="h-10 w-10 text-red-600" />
                    )}
                </div>

                <div className="flex items-center justify-center gap-2 mb-4">
                    <Calendar className="h-6 w-6 text-rose-600" />
                    <h1 className="text-2xl font-bold text-gray-900">
                        Google Calendar
                    </h1>
                </div>

                <p className={`text-lg ${status === 'error' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                    {message}
                </p>

                {status === 'error' && (
                    <div className="mt-6 space-y-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="btn-secondary w-full"
                        >
                            Go Back
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="btn-outline w-full"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {status === 'success' && (
                    <p className="mt-4 text-sm text-gray-500">
                        Redirecting you shortly...
                    </p>
                )}
            </div>
        </div>
    );
}
