import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import GoogleCalendarConnect from '../../components/GoogleCalendarConnect';
import { LayoutDashboard, Package, Users, Calendar, Settings, Clock, Save, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const navigation = [
    { name: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="h-5 w-5" /> },
    { name: 'Services', href: '/admin/services', icon: <Package className="h-5 w-5" /> },
    { name: 'Workers', href: '/admin/workers', icon: <Users className="h-5 w-5" /> },
    { name: 'Bookings', href: '/admin/bookings', icon: <Calendar className="h-5 w-5" /> },
    { name: 'Settings', href: '/admin/settings', icon: <Settings className="h-5 w-5" /> },
];

interface BusinessHours {
    start: string;
    end: string;
    closed: boolean;
}

interface BusinessHoursState {
    monday: BusinessHours;
    tuesday: BusinessHours;
    wednesday: BusinessHours;
    thursday: BusinessHours;
    friday: BusinessHours;
    saturday: BusinessHours;
    sunday: BusinessHours;
}

const defaultBusinessHours: BusinessHoursState = {
    monday: { start: '09:00', end: '18:00', closed: false },
    tuesday: { start: '09:00', end: '18:00', closed: false },
    wednesday: { start: '09:00', end: '18:00', closed: false },
    thursday: { start: '09:00', end: '18:00', closed: false },
    friday: { start: '09:00', end: '18:00', closed: false },
    saturday: { start: '09:00', end: '14:00', closed: false },
    sunday: { start: '09:00', end: '14:00', closed: true },
};

const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export default function SettingsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [calendarSettings, setCalendarSettings] = useState<any>(null);
    const [businessHours, setBusinessHours] = useState<BusinessHoursState>(defaultBusinessHours);
    const [bookingSettings, setBookingSettings] = useState({
        bufferMinutes: 15,
        maxAdvanceDays: 60,
        minAdvanceHours: 2,
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);

            // Fetch Google Calendar settings
            const { data: calendarData } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'google_calendar_admin')
                .single();

            if (calendarData) {
                setCalendarSettings(calendarData.value);
            }

            // Fetch business hours
            const { data: hoursData } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'business_hours')
                .single();

            if (hoursData) {
                setBusinessHours(hoursData.value);
            }

            // Fetch booking settings
            const { data: bookingData } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'booking_settings')
                .single();

            if (bookingData) {
                setBookingSettings(bookingData.value);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveBusinessHours = async () => {
        try {
            setSaving(true);

            const { error } = await supabase
                .from('system_settings')
                .upsert({
                    key: 'business_hours',
                    value: businessHours,
                    updated_at: new Date().toISOString(),
                });

            if (error) throw error;

            toast.success('Business hours saved successfully');
        } catch (error: any) {
            console.error('Error saving business hours:', error);
            toast.error('Failed to save business hours');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveBookingSettings = async () => {
        try {
            setSaving(true);

            const { error } = await supabase
                .from('system_settings')
                .upsert({
                    key: 'booking_settings',
                    value: bookingSettings,
                    updated_at: new Date().toISOString(),
                });

            if (error) throw error;

            toast.success('Booking settings saved successfully');
        } catch (error: any) {
            console.error('Error saving booking settings:', error);
            toast.error('Failed to save booking settings');
        } finally {
            setSaving(false);
        }
    };

    const handleDayHoursChange = (day: keyof BusinessHoursState, field: keyof BusinessHours, value: string | boolean) => {
        setBusinessHours(prev => ({
            ...prev,
            [day]: {
                ...prev[day],
                [field]: value,
            },
        }));
    };

    const handleCalendarConnectionChange = (connected: boolean) => {
        setCalendarSettings((prev: any) => ({
            ...prev,
            connected,
        }));
    };

    if (loading) {
        return (
            <DashboardLayout title="Settings" navigation={navigation}>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Settings" navigation={navigation}>
            <div className="space-y-8">
                {/* Google Calendar Integration */}
                <section>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-rose-600" />
                        Google Calendar Integration
                    </h2>
                    <GoogleCalendarConnect
                        isConnected={calendarSettings?.connected || false}
                        calendarId={calendarSettings?.calendar_id}
                        onConnectionChange={handleCalendarConnectionChange}
                    />
                    <p className="mt-3 text-sm text-gray-500">
                        Connect your admin Google Calendar to manage availability and automatically sync bookings.
                        Workers can also connect their own calendars from their dashboard.
                    </p>
                </section>

                {/* Business Hours */}
                <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Clock className="h-5 w-5 text-rose-600" />
                            Business Hours
                        </h2>
                        <button
                            onClick={handleSaveBusinessHours}
                            disabled={saving}
                            className="btn-primary inline-flex items-center gap-2"
                        >
                            {saving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            Save Hours
                        </button>
                    </div>

                    <div className="space-y-4">
                        {dayNames.map((day) => (
                            <div key={day} className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0">
                                <div className="w-28">
                                    <span className="font-medium text-gray-900 capitalize">{day}</span>
                                </div>

                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={!businessHours[day].closed}
                                        onChange={(e) => handleDayHoursChange(day, 'closed', !e.target.checked)}
                                        className="h-4 w-4 text-rose-600 border-gray-300 rounded focus:ring-rose-500"
                                    />
                                    <span className="text-sm text-gray-600">Open</span>
                                </label>

                                {!businessHours[day].closed && (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="time"
                                                value={businessHours[day].start}
                                                onChange={(e) => handleDayHoursChange(day, 'start', e.target.value)}
                                                className="input py-1.5 w-32"
                                            />
                                            <span className="text-gray-500">to</span>
                                            <input
                                                type="time"
                                                value={businessHours[day].end}
                                                onChange={(e) => handleDayHoursChange(day, 'end', e.target.value)}
                                                className="input py-1.5 w-32"
                                            />
                                        </div>
                                    </>
                                )}

                                {businessHours[day].closed && (
                                    <span className="text-sm text-gray-400 italic">Closed</span>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Booking Settings */}
                <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Settings className="h-5 w-5 text-rose-600" />
                            Booking Settings
                        </h2>
                        <button
                            onClick={handleSaveBookingSettings}
                            disabled={saving}
                            className="btn-primary inline-flex items-center gap-2"
                        >
                            {saving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            Save Settings
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Buffer Time Between Appointments
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="0"
                                    max="60"
                                    value={bookingSettings.bufferMinutes}
                                    onChange={(e) => setBookingSettings(prev => ({
                                        ...prev,
                                        bufferMinutes: parseInt(e.target.value) || 0,
                                    }))}
                                    className="input w-24"
                                />
                                <span className="text-sm text-gray-500">minutes</span>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                                Time gap between appointments
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Maximum Advance Booking
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="1"
                                    max="365"
                                    value={bookingSettings.maxAdvanceDays}
                                    onChange={(e) => setBookingSettings(prev => ({
                                        ...prev,
                                        maxAdvanceDays: parseInt(e.target.value) || 60,
                                    }))}
                                    className="input w-24"
                                />
                                <span className="text-sm text-gray-500">days</span>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                                How far in advance clients can book
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Minimum Advance Notice
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="0"
                                    max="72"
                                    value={bookingSettings.minAdvanceHours}
                                    onChange={(e) => setBookingSettings(prev => ({
                                        ...prev,
                                        minAdvanceHours: parseInt(e.target.value) || 2,
                                    }))}
                                    className="input w-24"
                                />
                                <span className="text-sm text-gray-500">hours</span>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                                Minimum time before an appointment can be booked
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </DashboardLayout>
    );
}
