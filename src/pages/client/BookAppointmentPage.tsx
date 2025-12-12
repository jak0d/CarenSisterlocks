import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    Sparkles, ArrowLeft, ArrowRight, Check, Clock, DollarSign,
    User, Mail, Phone, ChevronLeft, ChevronRight, Calendar,
    AlertCircle, Loader2, CheckCircle, MapPin
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import {
    getBusinessHours,
    getBusinessHoursForDay,
    calculateLocalAvailability,
    formatSlotTime,
    createCalendarEvent,
} from '../../lib/availability';
import type { TimeSlot } from '../../lib/availability';
import type { Service, Worker, BookingFormData } from '../../types';

// Step configuration
const STEPS = [
    { id: 1, title: 'Select Service', icon: Sparkles },
    { id: 2, title: 'Choose Specialist', icon: User },
    { id: 3, title: 'Pick Date & Time', icon: Calendar },
    { id: 4, title: 'Your Details', icon: Mail },
    { id: 5, title: 'Review & Confirm', icon: Check },
];

// Form validation
interface ValidationErrors {
    client_name?: string;
    client_email?: string;
    client_phone?: string;
}

function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePhone(phone: string): boolean {
    // Support Kenyan phone numbers (starts with 0 or +254)
    const phoneRegex = /^(\+254|0)[17]\d{8}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
}

export default function BookAppointmentPage() {
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);

    // Data
    const [services, setServices] = useState<Service[]>([]);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [businessHours, setBusinessHours] = useState<Record<string, { start: string; end: string; closed?: boolean }> | null>(null);
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);

    // Form data
    const [formData, setFormData] = useState<BookingFormData>({
        service_id: '',
        worker_id: null,
        client_name: '',
        client_email: '',
        client_phone: '',
        notes: '',
        booking_date: '',
        start_time: '',
    });

    const [errors, setErrors] = useState<ValidationErrors>({});

    // Selected data for display
    const selectedService = useMemo(() =>
        services.find(s => s.id === formData.service_id),
        [services, formData.service_id]
    );

    const selectedWorker = useMemo(() =>
        workers.find(w => w.id === formData.worker_id),
        [workers, formData.worker_id]
    );

    // Calendar state
    const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

    // Load initial data
    useEffect(() => {
        loadInitialData();
    }, []);

    // Load time slots when date or worker changes
    useEffect(() => {
        if (formData.booking_date && selectedService) {
            loadTimeSlots();
        }
    }, [formData.booking_date, formData.worker_id, selectedService]);

    async function loadInitialData() {
        setIsLoading(true);
        try {
            // Load services
            const { data: servicesData, error: servicesError } = await supabase
                .from('services')
                .select('*')
                .eq('is_active', true)
                .order('name');

            if (servicesError) throw servicesError;
            setServices(servicesData || []);

            // Load workers with calendar connected
            const { data: workersData, error: workersError } = await supabase
                .from('workers')
                .select('*')
                .eq('is_active', true)
                .order('name');

            if (workersError) throw workersError;
            setWorkers(workersData || []);

            // Load business hours
            const hours = await getBusinessHours();
            setBusinessHours(hours);
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Failed to load booking data');
        } finally {
            setIsLoading(false);
        }
    }

    async function loadTimeSlots() {
        setIsLoadingSlots(true);
        setTimeSlots([]);

        try {
            // Fetch existing bookings for the selected date
            const dateStr = formData.booking_date;
            const { data: bookings, error: bookingsError } = await supabase
                .from('bookings')
                .select('start_time, end_time, worker_id')
                .eq('booking_date', dateStr)
                .neq('status', 'cancelled');

            if (bookingsError) throw bookingsError;

            // Get business hours for the selected day
            const dayHours = getBusinessHoursForDay(businessHours || {}, dateStr);

            if (dayHours.closed) {
                setTimeSlots([]);
                return;
            }

            // Calculate available slots
            const slots = calculateLocalAvailability(
                dateStr,
                dayHours,
                selectedService?.duration_minutes || 60,
                bookings || []
            );

            setTimeSlots(slots);
        } catch (error) {
            console.error('Error loading time slots:', error);
            toast.error('Failed to load available times');
        } finally {
            setIsLoadingSlots(false);
        }
    }

    function handleServiceSelect(serviceId: string) {
        setFormData(prev => ({
            ...prev,
            service_id: serviceId,
            start_time: '' // Reset time when service changes
        }));
    }

    function handleWorkerSelect(workerId: string | null) {
        setFormData(prev => ({
            ...prev,
            worker_id: workerId,
            start_time: '' // Reset time when worker changes
        }));
    }

    function handleDateSelect(date: Date) {
        const dateStr = date.toISOString().split('T')[0];
        setFormData(prev => ({
            ...prev,
            booking_date: dateStr,
            start_time: '' // Reset time when date changes
        }));
    }

    function handleTimeSelect(slot: TimeSlot) {
        if (!slot.available) return;
        setFormData(prev => ({ ...prev, start_time: slot.startTime }));
    }

    function validateStep(): boolean {
        const newErrors: ValidationErrors = {};

        switch (currentStep) {
            case 1:
                if (!formData.service_id) {
                    toast.error('Please select a service');
                    return false;
                }
                break;
            case 2:
                // Worker selection is optional
                break;
            case 3:
                if (!formData.booking_date) {
                    toast.error('Please select a date');
                    return false;
                }
                if (!formData.start_time) {
                    toast.error('Please select a time slot');
                    return false;
                }
                break;
            case 4:
                if (!formData.client_name.trim()) {
                    newErrors.client_name = 'Name is required';
                }
                if (!formData.client_email.trim()) {
                    newErrors.client_email = 'Email is required';
                } else if (!validateEmail(formData.client_email)) {
                    newErrors.client_email = 'Please enter a valid email';
                }
                if (!formData.client_phone.trim()) {
                    newErrors.client_phone = 'Phone number is required';
                } else if (!validatePhone(formData.client_phone)) {
                    newErrors.client_phone = 'Please enter a valid Kenyan phone number';
                }
                setErrors(newErrors);
                if (Object.keys(newErrors).length > 0) {
                    return false;
                }
                break;
        }

        return true;
    }

    function handleNext() {
        if (validateStep()) {
            setCurrentStep(prev => Math.min(prev + 1, 5));
        }
    }

    function handleBack() {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    }

    async function handleSubmit() {
        if (!validateStep()) return;

        setIsSubmitting(true);
        try {
            // Calculate end time
            const startTime = new Date(formData.start_time);
            const endTime = new Date(startTime.getTime() + (selectedService?.duration_minutes || 60) * 60 * 1000);

            // Select a random worker if none selected
            let workerId = formData.worker_id;
            if (!workerId && workers.length > 0) {
                // Get workers who offer this service (or all if no specific mapping)
                workerId = workers[Math.floor(Math.random() * workers.length)].id;
            }

            // Create the booking
            const bookingData = {
                service_id: formData.service_id,
                worker_id: workerId,
                client_name: formData.client_name.trim(),
                client_email: formData.client_email.trim().toLowerCase(),
                client_phone: formData.client_phone.trim(),
                notes: formData.notes.trim() || null,
                booking_date: formData.booking_date,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                status: 'confirmed',
                total_price: selectedService?.base_price || null,
                deposit_required: selectedService?.requires_deposit || false,
                deposit_amount: selectedService?.deposit_amount || null,
                balance_due: selectedService?.requires_deposit
                    ? (selectedService?.base_price || 0) - (selectedService?.deposit_amount || 0)
                    : selectedService?.base_price || null,
            };

            const { data: booking, error: bookingError } = await supabase
                .from('bookings')
                .insert(bookingData)
                .select()
                .single();

            if (bookingError) throw bookingError;

            // Try to create calendar event
            if (booking && workerId) {
                try {
                    const calendarResult = await createCalendarEvent({
                        booking_id: booking.id,
                        worker_id: workerId,
                        service_name: selectedService?.name || 'Appointment',
                        client_name: formData.client_name,
                        client_email: formData.client_email,
                        client_phone: formData.client_phone,
                        start_time: startTime.toISOString(),
                        end_time: endTime.toISOString(),
                        notes: formData.notes,
                    });

                    if (calendarResult.success && calendarResult.event_id) {
                        // Update booking with calendar event ID
                        await supabase
                            .from('bookings')
                            .update({ google_calendar_event_id: calendarResult.event_id })
                            .eq('id', booking.id);
                    }
                } catch (calError) {
                    console.warn('Calendar event creation failed:', calError);
                    // Don't fail the booking if calendar fails
                }
            }

            setBookingSuccess(true);
            toast.success('Booking confirmed!');
        } catch (error: any) {
            console.error('Booking error:', error);
            toast.error(error.message || 'Failed to create booking');
        } finally {
            setIsSubmitting(false);
        }
    }

    // Calendar helpers
    function getDaysInMonth(date: Date): Date[] {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const days: Date[] = [];

        // Add padding for days before the first day of month
        const startPadding = firstDay.getDay();
        for (let i = startPadding - 1; i >= 0; i--) {
            days.push(new Date(year, month, -i));
        }

        // Add all days in the month
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push(new Date(year, month, i));
        }

        return days;
    }

    function isDateDisabled(date: Date): boolean {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Past dates
        if (date < today) return true;

        // Check if business is closed on that day
        const dateStr = date.toISOString().split('T')[0];
        const dayHours = getBusinessHoursForDay(businessHours || {}, dateStr);
        if (dayHours.closed) return true;

        // More than 30 days in the future
        const maxDate = new Date(today);
        maxDate.setDate(maxDate.getDate() + 30);
        if (date > maxDate) return true;

        return false;
    }

    function formatDate(dateStr: string): string {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    function formatTime(isoString: string): string {
        return formatSlotTime(isoString);
    }

    // Render loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-primary-600 animate-spin" />
                    <p className="text-gray-600">Loading booking options...</p>
                </div>
            </div>
        );
    }

    // Render success state
    if (bookingSuccess) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
                <header className="container-custom py-6">
                    <Link to="/" className="flex items-center space-x-2">
                        <Sparkles className="h-8 w-8 text-primary-600" />
                        <span className="text-2xl font-bold text-gray-900">CarenSisterlocks</span>
                    </Link>
                </header>

                <main className="container-custom py-12">
                    <div className="max-w-2xl mx-auto">
                        <div className="card text-center py-12">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-10 h-10 text-green-600" />
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-4">
                                Booking Confirmed!
                            </h1>
                            <p className="text-lg text-gray-600 mb-8">
                                Your appointment has been successfully booked. A confirmation email will be sent to{' '}
                                <span className="font-medium text-gray-900">{formData.client_email}</span>
                            </p>

                            <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left">
                                <h3 className="font-semibold text-gray-900 mb-4">Booking Details</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Service</span>
                                        <span className="font-medium text-gray-900">{selectedService?.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Date</span>
                                        <span className="font-medium text-gray-900">{formatDate(formData.booking_date)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Time</span>
                                        <span className="font-medium text-gray-900">{formatTime(formData.start_time)}</span>
                                    </div>
                                    {selectedWorker && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Specialist</span>
                                            <span className="font-medium text-gray-900">{selectedWorker.name}</span>
                                        </div>
                                    )}
                                    {selectedService?.base_price && (
                                        <div className="flex justify-between pt-3 border-t">
                                            <span className="text-gray-600">Total</span>
                                            <span className="font-bold text-gray-900">
                                                KES {selectedService.base_price.toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link
                                    to="/"
                                    className="btn btn-outline inline-flex items-center justify-center"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back to Home
                                </Link>
                                <button
                                    onClick={() => {
                                        setBookingSuccess(false);
                                        setCurrentStep(1);
                                        setFormData({
                                            service_id: '',
                                            worker_id: null,
                                            client_name: '',
                                            client_email: '',
                                            client_phone: '',
                                            notes: '',
                                            booking_date: '',
                                            start_time: '',
                                        });
                                    }}
                                    className="btn btn-primary inline-flex items-center justify-center"
                                >
                                    Book Another Appointment
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
            {/* Header */}
            <header className="container-custom py-6">
                <div className="flex items-center justify-between">
                    <Link to="/" className="flex items-center space-x-2">
                        <Sparkles className="h-8 w-8 text-primary-600" />
                        <span className="text-2xl font-bold text-gray-900">CarenSisterlocks</span>
                    </Link>
                    <Link to="/" className="btn btn-ghost">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Home
                    </Link>
                </div>
            </header>

            {/* Progress Steps */}
            <div className="container-custom py-4">
                <div className="max-w-4xl mx-auto">
                    <nav aria-label="Progress">
                        <ol className="flex items-center justify-between">
                            {STEPS.map((step, index) => {
                                const Icon = step.icon;
                                const isActive = step.id === currentStep;
                                const isCompleted = step.id < currentStep;

                                return (
                                    <li key={step.id} className="relative flex-1">
                                        <div className="flex flex-col items-center">
                                            <div
                                                className={`
                                                    w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center
                                                    transition-all duration-300
                                                    ${isCompleted
                                                        ? 'bg-primary-600 text-white'
                                                        : isActive
                                                            ? 'bg-primary-600 text-white ring-4 ring-primary-100'
                                                            : 'bg-gray-200 text-gray-500'
                                                    }
                                                `}
                                            >
                                                {isCompleted ? (
                                                    <Check className="w-5 h-5 sm:w-6 sm:h-6" />
                                                ) : (
                                                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                                                )}
                                            </div>
                                            <span className={`
                                                mt-2 text-xs sm:text-sm font-medium hidden sm:block
                                                ${isActive || isCompleted ? 'text-primary-600' : 'text-gray-500'}
                                            `}>
                                                {step.title}
                                            </span>
                                        </div>
                                        {index < STEPS.length - 1 && (
                                            <div
                                                className={`
                                                    absolute top-5 sm:top-6 left-1/2 w-full h-0.5
                                                    ${isCompleted ? 'bg-primary-600' : 'bg-gray-200'}
                                                `}
                                                style={{ left: '50%' }}
                                            />
                                        )}
                                    </li>
                                );
                            })}
                        </ol>
                    </nav>
                </div>
            </div>

            {/* Main Content */}
            <main className="container-custom py-8">
                <div className="max-w-4xl mx-auto">
                    {/* Step 1: Service Selection */}
                    {currentStep === 1 && (
                        <div className="animate-fadeIn">
                            <div className="text-center mb-8">
                                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                    Select a Service
                                </h1>
                                <p className="text-gray-600">
                                    Choose the service you'd like to book
                                </p>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                {services.map(service => (
                                    <button
                                        key={service.id}
                                        onClick={() => handleServiceSelect(service.id)}
                                        className={`
                                            card card-hover text-left p-6 transition-all duration-200
                                            ${formData.service_id === service.id
                                                ? 'ring-2 ring-primary-500 bg-primary-50'
                                                : 'hover:border-primary-300'
                                            }
                                        `}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {service.name}
                                            </h3>
                                            {formData.service_id === service.id && (
                                                <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
                                                    <Check className="w-4 h-4 text-white" />
                                                </div>
                                            )}
                                        </div>
                                        {service.description && (
                                            <p className="text-gray-600 text-sm mb-4">
                                                {service.description}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-4 text-sm">
                                            <div className="flex items-center text-gray-500">
                                                <Clock className="w-4 h-4 mr-1" />
                                                {service.duration_minutes} min
                                            </div>
                                            {service.base_price && (
                                                <div className="flex items-center text-gray-900 font-medium">
                                                    <DollarSign className="w-4 h-4 mr-1" />
                                                    KES {service.base_price.toLocaleString()}
                                                </div>
                                            )}
                                        </div>
                                        {service.requires_deposit && service.deposit_amount && (
                                            <div className="mt-3 inline-flex items-center text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                                                <AlertCircle className="w-3 h-3 mr-1" />
                                                KES {service.deposit_amount.toLocaleString()} deposit required
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {services.length === 0 && (
                                <div className="card text-center py-12">
                                    <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-600">No services available at the moment.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2: Worker Selection */}
                    {currentStep === 2 && (
                        <div className="animate-fadeIn">
                            <div className="text-center mb-8">
                                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                    Choose a Specialist
                                </h1>
                                <p className="text-gray-600">
                                    Select your preferred specialist or choose "Any Available"
                                </p>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {/* Any Available Option */}
                                <button
                                    onClick={() => handleWorkerSelect(null)}
                                    className={`
                                        card card-hover text-left p-6 transition-all duration-200
                                        ${formData.worker_id === null
                                            ? 'ring-2 ring-primary-500 bg-primary-50'
                                            : 'hover:border-primary-300'
                                        }
                                    `}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-secondary-500 flex items-center justify-center">
                                            <User className="w-6 h-6 text-white" />
                                        </div>
                                        {formData.worker_id === null && (
                                            <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
                                                <Check className="w-4 h-4 text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                        Any Available
                                    </h3>
                                    <p className="text-gray-600 text-sm">
                                        We'll assign the next available specialist
                                    </p>
                                </button>

                                {/* Individual Workers */}
                                {workers.map(worker => (
                                    <button
                                        key={worker.id}
                                        onClick={() => handleWorkerSelect(worker.id)}
                                        className={`
                                            card card-hover text-left p-6 transition-all duration-200
                                            ${formData.worker_id === worker.id
                                                ? 'ring-2 ring-primary-500 bg-primary-50'
                                                : 'hover:border-primary-300'
                                            }
                                        `}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-secondary-400 to-primary-500 flex items-center justify-center">
                                                <span className="text-white font-semibold text-lg">
                                                    {worker.name.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            {formData.worker_id === worker.id && (
                                                <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
                                                    <Check className="w-4 h-4 text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                            {worker.name}
                                        </h3>
                                        <div className="flex items-center text-sm">
                                            {worker.calendar_connected ? (
                                                <span className="text-green-600 flex items-center">
                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                    Calendar synced
                                                </span>
                                            ) : (
                                                <span className="text-gray-500">Available</span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Date & Time Selection */}
                    {currentStep === 3 && (
                        <div className="animate-fadeIn">
                            <div className="text-center mb-8">
                                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                    Pick a Date & Time
                                </h1>
                                <p className="text-gray-600">
                                    Select your preferred appointment date and time
                                </p>
                            </div>

                            <div className="grid gap-6 lg:grid-cols-2">
                                {/* Calendar */}
                                <div className="card">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-gray-900">
                                            {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                        </h3>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    const newMonth = new Date(calendarMonth);
                                                    newMonth.setMonth(newMonth.getMonth() - 1);
                                                    setCalendarMonth(newMonth);
                                                }}
                                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                            >
                                                <ChevronLeft className="w-5 h-5 text-gray-600" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const newMonth = new Date(calendarMonth);
                                                    newMonth.setMonth(newMonth.getMonth() + 1);
                                                    setCalendarMonth(newMonth);
                                                }}
                                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                            >
                                                <ChevronRight className="w-5 h-5 text-gray-600" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-7 gap-1 mb-2">
                                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                                                {day}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-7 gap-1">
                                        {getDaysInMonth(calendarMonth).map((date, index) => {
                                            const isCurrentMonth = date.getMonth() === calendarMonth.getMonth();
                                            const isDisabled = isDateDisabled(date);
                                            const isSelected = formData.booking_date === date.toISOString().split('T')[0];
                                            const isToday = date.toDateString() === new Date().toDateString();

                                            return (
                                                <button
                                                    key={index}
                                                    onClick={() => !isDisabled && handleDateSelect(date)}
                                                    disabled={isDisabled}
                                                    className={`
                                                        p-2 sm:p-3 rounded-lg text-sm font-medium transition-all
                                                        ${!isCurrentMonth ? 'text-gray-300' : ''}
                                                        ${isDisabled ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-primary-50'}
                                                        ${isSelected ? 'bg-primary-600 text-white hover:bg-primary-700' : ''}
                                                        ${isToday && !isSelected ? 'ring-2 ring-primary-400' : ''}
                                                    `}
                                                >
                                                    {date.getDate()}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Time Slots */}
                                <div className="card">
                                    <h3 className="font-semibold text-gray-900 mb-4">
                                        {formData.booking_date
                                            ? `Available Times for ${formatDate(formData.booking_date)}`
                                            : 'Select a date to see available times'
                                        }
                                    </h3>

                                    {!formData.booking_date && (
                                        <div className="text-center py-12 text-gray-500">
                                            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                            <p>Please select a date first</p>
                                        </div>
                                    )}

                                    {formData.booking_date && isLoadingSlots && (
                                        <div className="text-center py-12">
                                            <Loader2 className="w-8 h-8 mx-auto mb-4 text-primary-600 animate-spin" />
                                            <p className="text-gray-500">Loading available times...</p>
                                        </div>
                                    )}

                                    {formData.booking_date && !isLoadingSlots && timeSlots.length === 0 && (
                                        <div className="text-center py-12 text-gray-500">
                                            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                            <p>No available times for this date</p>
                                            <p className="text-sm mt-2">Please select another date</p>
                                        </div>
                                    )}

                                    {formData.booking_date && !isLoadingSlots && timeSlots.length > 0 && (
                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-80 overflow-y-auto">
                                            {timeSlots.map((slot, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => handleTimeSelect(slot)}
                                                    disabled={!slot.available}
                                                    className={`
                                                        p-3 rounded-lg text-sm font-medium transition-all
                                                        ${!slot.available
                                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed line-through'
                                                            : formData.start_time === slot.startTime
                                                                ? 'bg-primary-600 text-white'
                                                                : 'bg-gray-50 text-gray-700 hover:bg-primary-50 hover:text-primary-700'
                                                        }
                                                    `}
                                                >
                                                    {formatSlotTime(slot.startTime)}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Contact Information */}
                    {currentStep === 4 && (
                        <div className="animate-fadeIn">
                            <div className="text-center mb-8">
                                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                    Your Details
                                </h1>
                                <p className="text-gray-600">
                                    Enter your contact information for the appointment
                                </p>
                            </div>

                            <div className="max-w-xl mx-auto">
                                <div className="card">
                                    <div className="space-y-6">
                                        {/* Name */}
                                        <div>
                                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                                                Full Name *
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <User className="h-5 w-5 text-gray-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    id="name"
                                                    value={formData.client_name}
                                                    onChange={(e) => {
                                                        setFormData(prev => ({ ...prev, client_name: e.target.value }));
                                                        if (errors.client_name) setErrors(prev => ({ ...prev, client_name: undefined }));
                                                    }}
                                                    placeholder="Enter your full name"
                                                    className={`input pl-10 ${errors.client_name ? 'input-error' : ''}`}
                                                />
                                            </div>
                                            {errors.client_name && (
                                                <p className="mt-1 text-sm text-red-600">{errors.client_name}</p>
                                            )}
                                        </div>

                                        {/* Email */}
                                        <div>
                                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                                Email Address *
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Mail className="h-5 w-5 text-gray-400" />
                                                </div>
                                                <input
                                                    type="email"
                                                    id="email"
                                                    value={formData.client_email}
                                                    onChange={(e) => {
                                                        setFormData(prev => ({ ...prev, client_email: e.target.value }));
                                                        if (errors.client_email) setErrors(prev => ({ ...prev, client_email: undefined }));
                                                    }}
                                                    placeholder="your.email@example.com"
                                                    className={`input pl-10 ${errors.client_email ? 'input-error' : ''}`}
                                                />
                                            </div>
                                            {errors.client_email && (
                                                <p className="mt-1 text-sm text-red-600">{errors.client_email}</p>
                                            )}
                                        </div>

                                        {/* Phone */}
                                        <div>
                                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                                                Phone Number *
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Phone className="h-5 w-5 text-gray-400" />
                                                </div>
                                                <input
                                                    type="tel"
                                                    id="phone"
                                                    value={formData.client_phone}
                                                    onChange={(e) => {
                                                        setFormData(prev => ({ ...prev, client_phone: e.target.value }));
                                                        if (errors.client_phone) setErrors(prev => ({ ...prev, client_phone: undefined }));
                                                    }}
                                                    placeholder="0712345678 or +254712345678"
                                                    className={`input pl-10 ${errors.client_phone ? 'input-error' : ''}`}
                                                />
                                            </div>
                                            {errors.client_phone && (
                                                <p className="mt-1 text-sm text-red-600">{errors.client_phone}</p>
                                            )}
                                            <p className="mt-1 text-xs text-gray-500">
                                                Kenyan phone number for M-Pesa payments and SMS reminders
                                            </p>
                                        </div>

                                        {/* Notes */}
                                        <div>
                                            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                                                Additional Notes (Optional)
                                            </label>
                                            <textarea
                                                id="notes"
                                                rows={3}
                                                value={formData.notes}
                                                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                                placeholder="Any special requests or information..."
                                                className="input resize-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 5: Review & Confirm */}
                    {currentStep === 5 && (
                        <div className="animate-fadeIn">
                            <div className="text-center mb-8">
                                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                    Review Your Booking
                                </h1>
                                <p className="text-gray-600">
                                    Please review your appointment details before confirming
                                </p>
                            </div>

                            <div className="max-w-2xl mx-auto">
                                <div className="card">
                                    {/* Service Details */}
                                    <div className="flex items-start gap-4 pb-6 border-b">
                                        <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                                            <Sparkles className="w-6 h-6 text-primary-600" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900">{selectedService?.name}</h3>
                                            <p className="text-sm text-gray-500">{selectedService?.description}</p>
                                            <div className="flex items-center gap-4 mt-2 text-sm">
                                                <span className="flex items-center text-gray-600">
                                                    <Clock className="w-4 h-4 mr-1" />
                                                    {selectedService?.duration_minutes} min
                                                </span>
                                                {selectedService?.base_price && (
                                                    <span className="font-medium text-gray-900">
                                                        KES {selectedService.base_price.toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Appointment Details */}
                                    <div className="py-6 border-b space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                                <Calendar className="w-5 h-5 text-gray-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Date & Time</p>
                                                <p className="font-medium text-gray-900">
                                                    {formatDate(formData.booking_date)} at {formatTime(formData.start_time)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                                <User className="w-5 h-5 text-gray-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Specialist</p>
                                                <p className="font-medium text-gray-900">
                                                    {selectedWorker ? selectedWorker.name : 'Any Available'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                                <MapPin className="w-5 h-5 text-gray-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Location</p>
                                                <p className="font-medium text-gray-900">CarenSisterlocks Studio</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Contact Details */}
                                    <div className="py-6 border-b space-y-3">
                                        <h4 className="font-semibold text-gray-900">Your Information</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-gray-500">Name</p>
                                                <p className="font-medium text-gray-900">{formData.client_name}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500">Email</p>
                                                <p className="font-medium text-gray-900">{formData.client_email}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500">Phone</p>
                                                <p className="font-medium text-gray-900">{formData.client_phone}</p>
                                            </div>
                                            {formData.notes && (
                                                <div className="sm:col-span-2">
                                                    <p className="text-gray-500">Notes</p>
                                                    <p className="font-medium text-gray-900">{formData.notes}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Payment Summary */}
                                    <div className="pt-6">
                                        <h4 className="font-semibold text-gray-900 mb-4">Payment Summary</h4>
                                        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Service</span>
                                                <span className="text-gray-900">
                                                    KES {(selectedService?.base_price || 0).toLocaleString()}
                                                </span>
                                            </div>
                                            {selectedService?.requires_deposit && (
                                                <>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-600">Deposit Required</span>
                                                        <span className="text-amber-600 font-medium">
                                                            KES {(selectedService?.deposit_amount || 0).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-600">Balance Due at Appointment</span>
                                                        <span className="text-gray-900">
                                                            KES {((selectedService?.base_price || 0) - (selectedService?.deposit_amount || 0)).toLocaleString()}
                                                        </span>
                                                    </div>
                                                </>
                                            )}
                                            <div className="flex justify-between pt-2 border-t mt-2">
                                                <span className="font-semibold text-gray-900">Total</span>
                                                <span className="font-bold text-primary-600">
                                                    KES {(selectedService?.base_price || 0).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>

                                        {selectedService?.requires_deposit && (
                                            <div className="mt-4 p-4 bg-amber-50 rounded-xl flex gap-3">
                                                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                                <div className="text-sm">
                                                    <p className="font-medium text-amber-800">Deposit Required</p>
                                                    <p className="text-amber-700">
                                                        A deposit of KES {(selectedService?.deposit_amount || 0).toLocaleString()} is
                                                        required to confirm your booking. You'll receive payment instructions after confirmation.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="mt-8 flex justify-between items-center">
                        <button
                            onClick={handleBack}
                            disabled={currentStep === 1}
                            className={`btn btn-ghost ${currentStep === 1 ? 'invisible' : ''}`}
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back
                        </button>

                        {currentStep < 5 ? (
                            <button
                                onClick={handleNext}
                                className="btn btn-primary"
                            >
                                Continue
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="btn btn-primary min-w-[180px]"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Confirming...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4 mr-2" />
                                        Confirm Booking
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="container-custom py-8 border-t mt-12">
                <p className="text-center text-sm text-gray-500">
                    Need help? Contact us at <a href="mailto:hello@carensisterlocks.com" className="text-primary-600 hover:underline">hello@carensisterlocks.com</a>
                </p>
            </footer>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out;
                }
            `}</style>
        </div>
    );
}
