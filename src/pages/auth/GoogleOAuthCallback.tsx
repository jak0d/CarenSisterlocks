import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, CheckCircle, XCircle, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

export default function GoogleOAuthCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [message, setMessage] = useState('Processing Google Calendar connection...');

    useEffect(() => {
        handleOAuthCallback();
    }, []);

    const handleOAuthCallback = async () => {
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

            const response = await fetch(`${supabaseUrl}/functions/v1/google-calendar-auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify({
                    code,
                    redirect_uri: `${window.location.origin}/oauth/google/callback`,
                    user_id: user?.id,
                    user_role: user?.role,
                    state,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to connect Google Calendar');
            }

            const data = await response.json();

            // Update the worker/admin calendar connection status
            if (user?.role === 'worker') {
                const { error: updateError } = await supabase
                    .from('workers')
                    .update({
                        google_calendar_id: data.calendar_id,
                        google_access_token: data.access_token,
                        google_refresh_token: data.refresh_token,
                        calendar_connected: true,
                    })
                    .eq('user_id', user.id);

                if (updateError) {
                    throw updateError;
                }
            } else if (user?.role === 'admin') {
                // For admin, store in system_settings
                const { error: updateError } = await supabase
                    .from('system_settings')
                    .upsert({
                        key: 'google_calendar_admin',
                        value: {
                            calendar_id: data.calendar_id,
                            access_token: data.access_token,
                            refresh_token: data.refresh_token,
                            connected: true,
                            connected_at: new Date().toISOString(),
                            connected_by: user.id,
                        },
                    });

                if (updateError) {
                    throw updateError;
                }
            }

            setStatus('success');
            setMessage('Google Calendar connected successfully!');
            toast.success('Google Calendar connected!');

            // Redirect after a short delay
            setTimeout(() => {
                if (user?.role === 'admin') {
                    navigate('/admin/settings');
                } else if (user?.role === 'worker') {
                    navigate('/worker');
                } else {
                    navigate('/');
                }
            }, 2000);

        } catch (err: any) {
            console.error('OAuth callback error:', err);
            setStatus('error');
            setMessage(err.message || 'Failed to connect Google Calendar');
            toast.error('Failed to connect Google Calendar');
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
