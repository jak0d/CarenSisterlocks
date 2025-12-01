// Database Types
export interface Service {
    id: string;
    name: string;
    description: string | null;
    base_price: number | null;
    duration_minutes: number;
    requires_deposit: boolean;
    deposit_amount: number | null;
    is_active: boolean;
    status?: 'active' | 'pending' | 'rejected';
    created_at: string;
    updated_at: string;
}

export interface Worker {
    id: string;
    name: string;
    email: string;
    google_calendar_id: string | null;
    google_access_token: string | null;
    google_refresh_token: string | null;
    calendar_connected: boolean;
    dashboard_permission: 'none' | 'view' | 'worker';
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface WorkerService {
    id: string;
    worker_id: string;
    service_id: string;
    custom_price: number | null;
    created_at: string;
    worker?: Worker;
    service?: Service;
}

export interface Booking {
    id: string;
    worker_id: string;
    service_id: string;
    client_name: string;
    client_email: string;
    client_phone: string;
    notes: string | null;
    booking_date: string;
    start_time: string;
    end_time: string;
    status: 'confirmed' | 'completed' | 'cancelled';
    total_price: number | null;
    deposit_required: boolean;
    deposit_paid: boolean;
    deposit_amount: number | null;
    balance_due: number | null;
    google_calendar_event_id: string | null;
    payment_transaction_id: string | null;
    created_at: string;
    updated_at: string;
    cancelled_at: string | null;
    worker?: Worker;
    service?: Service;
}

export interface Payment {
    id: string;
    booking_id: string;
    mpesa_transaction_id: string | null;
    phone_number: string;
    amount: number;
    status: 'pending' | 'success' | 'failed';
    mpesa_receipt_number: string | null;
    transaction_date: string | null;
    error_message: string | null;
    created_at: string;
    updated_at: string;
}

export interface Admin {
    id: string;
    email: string;
    name: string | null;
    invited_by: string | null;
    created_at: string;
}

export interface SystemSettings {
    key: string;
    value: Record<string, any>;
    updated_at: string;
}

// User Profile Types
export interface UserProfile {
    id: string;
    email: string;
    full_name: string | null;
    role: 'client' | 'worker' | 'admin';
    created_at: string;
    updated_at: string;
}

// Form Types
export interface BookingFormData {
    service_id: string;
    worker_id: string | null;
    client_name: string;
    client_email: string;
    client_phone: string;
    notes: string;
    booking_date: string;
    start_time: string;
}

export interface ServiceFormData {
    name: string;
    description: string;
    base_price: number | null;
    duration_minutes: number;
    requires_deposit: boolean;
    deposit_amount: number | null;
    is_active: boolean;
}

export interface WorkerFormData {
    name: string;
    email: string;
    dashboard_permission: 'none' | 'view' | 'worker';
    is_active: boolean;
}

// API Response Types
export interface AvailabilitySlot {
    start_time: string;
    end_time: string;
    available: boolean;
}

export interface AvailabilityResponse {
    date: string;
    slots: AvailabilitySlot[];
}

export interface PaymentInitiationResponse {
    status: 'pending_payment' | 'success' | 'error';
    checkoutRequestID?: string;
    message?: string;
}

export interface DashboardStats {
    total_bookings: number;
    total_revenue: number;
    total_deposits: number;
    active_services: number;
    active_workers: number;
    today_appointments: number;
}

// M-Pesa Types
export interface MPesaConfig {
    short_code: string;
    consumer_key: string;
    consumer_secret: string;
    passkey: string;
    environment: 'sandbox' | 'production';
}

// Business Hours Types
export interface BusinessHours {
    monday: { start: string; end: string; closed?: boolean };
    tuesday: { start: string; end: string; closed?: boolean };
    wednesday: { start: string; end: string; closed?: boolean };
    thursday: { start: string; end: string; closed?: boolean };
    friday: { start: string; end: string; closed?: boolean };
    saturday: { start: string; end: string; closed?: boolean };
    sunday: { start: string; end: string; closed?: boolean };
}

// Auth Types
export interface AuthUser {
    id: string;
    email: string;
    role: 'client' | 'worker' | 'admin';
    full_name: string | null;
}
