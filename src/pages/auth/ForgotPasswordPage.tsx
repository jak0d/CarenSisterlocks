import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface ForgotPasswordFormData {
    email: string;
}

export default function ForgotPasswordPage() {
    const { resetPassword } = useAuth();
    const [loading, setLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordFormData>();

    const onSubmit = async (data: ForgotPasswordFormData) => {
        setLoading(true);
        try {
            await resetPassword(data.email);
            setEmailSent(true);
            toast.success('Password reset email sent!');
        } catch (error: any) {
            toast.error(error.message || 'Failed to send reset email');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link to="/" className="inline-flex items-center space-x-2">
                        <Sparkles className="h-10 w-10 text-primary-600" />
                        <span className="text-3xl font-bold text-gray-900">CarenSisterlocks</span>
                    </Link>
                </div>

                {/* Card */}
                <div className="card">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h1>
                    <p className="text-gray-600 mb-6">
                        Enter your email address and we'll send you a link to reset your password.
                    </p>

                    {emailSent ? (
                        <div className="text-center space-y-4">
                            <div className="p-4 bg-green-50 text-green-700 rounded-lg">
                                Check your email for the password reset link.
                            </div>
                            <Link to="/login" className="btn btn-primary w-full block">
                                Return to Login
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                    Email Address
                                </label>
                                <input
                                    {...register('email', {
                                        required: 'Email is required',
                                        pattern: {
                                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                            message: 'Invalid email address',
                                        },
                                    })}
                                    type="email"
                                    id="email"
                                    className={`input ${errors.email ? 'input-error' : ''}`}
                                    placeholder="you@example.com"
                                />
                                {errors.email && (
                                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Sending Link...' : 'Send Reset Link'}
                            </button>
                        </form>
                    )}

                    <div className="mt-6 text-center">
                        <Link to="/login" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
