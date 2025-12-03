import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface LoginFormData {
    email: string;
    password: string;
}

export default function LoginPage() {
    const { signIn } = useAuth();
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>();

    const onSubmit = async (data: LoginFormData) => {
        setLoading(true);
        try {
            await signIn(data.email, data.password);
            toast.success('Welcome back!');
            // Navigation will be handled by the App component based on user role
        } catch (error: any) {
            toast.error(error.message || 'Failed to sign in');
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

                {/* Login Card */}
                <div className="card">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h1>
                    <p className="text-gray-600 mb-6">Sign in to access your dashboard</p>

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

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                Password
                            </label>
                            <input
                                {...register('password', {
                                    required: 'Password is required',
                                    minLength: {
                                        value: 6,
                                        message: 'Password must be at least 6 characters',
                                    },
                                })}
                                type="password"
                                id="password"
                                className={`input ${errors.password ? 'input-error' : ''}`}
                                placeholder="••••••••"
                            />
                            {errors.password && (
                                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                            )}
                        </div>

                        <div className="flex justify-end">
                            <Link
                                to="/forgot-password"
                                className="text-sm font-medium text-primary-600 hover:text-primary-500"
                            >
                                Forgot your password?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            Don't have an account?{' '}
                            <Link to="/signup" className="text-primary-600 hover:text-primary-700 font-medium">
                                Sign up
                            </Link>
                        </p>
                    </div>

                    <div className="mt-4 text-center">
                        <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">
                            ← Back to home
                        </Link>
                    </div>
                </div>

                {/* Info Box */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                        <strong>Note:</strong> Clients don't need to sign in to book appointments.
                        This login is for workers and administrators only.
                    </p>
                </div>
            </div>
        </div>
    );
}
