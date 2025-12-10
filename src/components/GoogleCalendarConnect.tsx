import { useState } from 'react';
import { Calendar, Link2, Unlink, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { getGoogleAuthUrl, isGoogleCalendarConfigured } from '../lib/googleCalendar';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface GoogleCalendarConnectProps {
    isConnected: boolean;
    calendarId?: string | null;
    onConnectionChange?: (connected: boolean) => void;
    variant?: 'card' | 'inline';
    showCalendarId?: boolean;
}

export default function GoogleCalendarConnect({
    isConnected,
    calendarId,
    onConnectionChange,
    variant = 'card',
    showCalendarId = true,
}: GoogleCalendarConnectProps) {
    const { user } = useAuth();
    const [disconnecting, setDisconnecting] = useState(false);
    const isConfigured = isGoogleCalendarConfigured();

    const handleConnect = () => {
        if (!isConfigured) {
            toast.error('Google Calendar is not configured. Please contact the administrator.');
            return;
        }

        // Generate state for security
        const state = btoa(JSON.stringify({
            user_id: user?.id,
            role: user?.role,
            timestamp: Date.now(),
        }));

        // Redirect to Google OAuth
        const authUrl = getGoogleAuthUrl(state);
        if (authUrl) {
            window.location.href = authUrl;
        }
    };

    const handleDisconnect = async () => {
        if (!user) return;

        try {
            setDisconnecting(true);

            if (user.role === 'worker') {
                const { error } = await supabase
                    .from('workers')
                    .update({
                        google_calendar_id: null,
                        google_access_token: null,
                        google_refresh_token: null,
                        calendar_connected: false,
                    })
                    .eq('user_id', user.id);

                if (error) throw error;
            } else if (user.role === 'admin') {
                const { error } = await supabase
                    .from('system_settings')
                    .upsert({
                        key: 'google_calendar_admin',
                        value: {
                            connected: false,
                            disconnected_at: new Date().toISOString(),
                        },
                    });

                if (error) throw error;
            }

            toast.success('Google Calendar disconnected');
            onConnectionChange?.(false);
        } catch (error: any) {
            console.error('Error disconnecting calendar:', error);
            toast.error('Failed to disconnect calendar');
        } finally {
            setDisconnecting(false);
        }
    };

    if (variant === 'inline') {
        return (
            <div className="flex items-center gap-3">
                {isConnected ? (
                    <>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Connected
                        </span>
                        <button
                            onClick={handleDisconnect}
                            disabled={disconnecting}
                            className="text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                            {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                        </button>
                    </>
                ) : (
                    <>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Not Connected
                        </span>
                        <button
                            onClick={handleConnect}
                            disabled={!isConfigured}
                            className="text-sm text-rose-600 hover:text-rose-700 font-medium"
                        >
                            Connect
                        </button>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isConnected ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                    <Calendar className={`h-6 w-6 ${isConnected ? 'text-green-600' : 'text-gray-500'
                        }`} />
                </div>

                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        Google Calendar
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                        {isConnected
                            ? 'Your calendar is connected. Bookings will automatically sync.'
                            : 'Connect your Google Calendar to manage availability and sync bookings.'}
                    </p>

                    {isConnected && showCalendarId && calendarId && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">Calendar ID</p>
                            <p className="text-sm font-mono text-gray-700 break-all">
                                {calendarId}
                            </p>
                        </div>
                    )}

                    {!isConfigured && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-amber-800">
                                        Configuration Required
                                    </p>
                                    <p className="text-xs text-amber-700 mt-1">
                                        Google Calendar integration needs to be set up. Contact the administrator to add the Google Client ID.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3">
                        {isConnected ? (
                            <button
                                onClick={handleDisconnect}
                                disabled={disconnecting}
                                className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors font-medium text-sm"
                            >
                                {disconnecting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Disconnecting...
                                    </>
                                ) : (
                                    <>
                                        <Unlink className="h-4 w-4" />
                                        Disconnect Calendar
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={handleConnect}
                                disabled={!isConfigured}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${isConfigured
                                        ? 'bg-rose-600 text-white hover:bg-rose-700'
                                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                <Link2 className="h-4 w-4" />
                                Connect Google Calendar
                            </button>
                        )}
                    </div>
                </div>

                {isConnected && (
                    <div className="flex-shrink-0">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            <CheckCircle className="h-4 w-4" />
                            Connected
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
