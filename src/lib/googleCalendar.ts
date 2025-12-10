// Google Calendar Integration Library
// This module handles Google OAuth and Calendar API interactions

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_REDIRECT_URI = `${window.location.origin}/oauth/google/callback`;

// Google OAuth scopes required for calendar access
const GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

export interface GoogleCalendarEvent {
    id: string;
    summary: string;
    description?: string;
    start: {
        dateTime: string;
        timeZone?: string;
    };
    end: {
        dateTime: string;
        timeZone?: string;
    };
    status?: string;
}

export interface CalendarFreeBusy {
    timeMin: string;
    timeMax: string;
    busy: Array<{
        start: string;
        end: string;
    }>;
}

export interface TimeSlot {
    startTime: string;
    endTime: string;
    available: boolean;
}

export interface GoogleTokens {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    scope: string;
}

/**
 * Generate the Google OAuth authorization URL
 */
export function getGoogleAuthUrl(state?: string): string {
    if (!GOOGLE_CLIENT_ID) {
        console.warn('Google Client ID not configured. Please set VITE_GOOGLE_CLIENT_ID in your .env file.');
        return '';
    }

    const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: GOOGLE_REDIRECT_URI,
        response_type: 'code',
        scope: GOOGLE_SCOPES,
        access_type: 'offline',
        prompt: 'consent',
        ...(state && { state }),
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens (via Supabase Edge Function)
 */
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
    const response = await fetch('/api/google/exchange-token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, redirect_uri: GOOGLE_REDIRECT_URI }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to exchange code for tokens');
    }

    return response.json();
}

/**
 * Parse busy times into a format we can use for availability calculation
 */
export function parseBusyTimes(freeBusy: CalendarFreeBusy): Array<{ start: Date; end: Date }> {
    return freeBusy.busy.map(slot => ({
        start: new Date(slot.start),
        end: new Date(slot.end),
    }));
}

/**
 * Calculate available time slots for a given date
 */
export function calculateAvailableSlots(
    date: Date,
    busyTimes: Array<{ start: Date; end: Date }>,
    businessHours: { start: string; end: string },
    slotDurationMinutes: number,
    bufferMinutes: number = 15
): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const dateStr = date.toISOString().split('T')[0];

    // Parse business hours
    const [startHour, startMinute] = businessHours.start.split(':').map(Number);
    const [endHour, endMinute] = businessHours.end.split(':').map(Number);

    const dayStart = new Date(date);
    dayStart.setHours(startHour, startMinute, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(endHour, endMinute, 0, 0);

    // Filter busy times for this specific date
    const todayBusy = busyTimes.filter(slot => {
        const slotDate = slot.start.toISOString().split('T')[0];
        return slotDate === dateStr;
    });

    // Generate slots
    let currentTime = new Date(dayStart);
    while (currentTime < dayEnd) {
        const slotEnd = new Date(currentTime.getTime() + slotDurationMinutes * 60 * 1000);

        // Check if slot exceeds business hours
        if (slotEnd > dayEnd) break;

        // Check if slot overlaps with any busy time
        const isAvailable = !todayBusy.some(busy => {
            const bufferedStart = new Date(busy.start.getTime() - bufferMinutes * 60 * 1000);
            const bufferedEnd = new Date(busy.end.getTime() + bufferMinutes * 60 * 1000);
            return currentTime < bufferedEnd && slotEnd > bufferedStart;
        });

        slots.push({
            startTime: currentTime.toISOString(),
            endTime: slotEnd.toISOString(),
            available: isAvailable,
        });

        // Move to next slot (30-minute intervals for better granularity)
        currentTime = new Date(currentTime.getTime() + 30 * 60 * 1000);
    }

    return slots;
}

/**
 * Format time for display
 */
export function formatTimeSlot(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

/**
 * Check if Google Calendar is configured
 */
export function isGoogleCalendarConfigured(): boolean {
    return !!GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'your_google_client_id';
}

/**
 * Get Google Client ID (for debugging)
 */
export function getGoogleClientId(): string {
    return GOOGLE_CLIENT_ID;
}
