import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface UpdatePasswordFormData {
    password: string;
    confirmPassword: string;
}

export default function UpdatePasswordPage() {
    const { updatePassword, user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<UpdatePasswordFormData>();

    const password = watch('password');

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login');
        }
    }, [user, authLoading, navigate]);

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    const onSubmit = async (data: UpdatePasswordFormData) => {
        setLoading(true);
        try {
            await updatePassword(data.password);
            toast.success('Password updated successfully!');
            navigate('/login');
        } catch (error: any) {
            toast.error(error.message || 'Failed to update password');
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
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Update Password</h1>
                    <p className="text-gray-600 mb-6">Enter your new password below.</p>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                New Password
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

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                Confirm New Password
                            </label>
                            <input
                                {...register('confirmPassword', {
                                    required: 'Please confirm your password',
                                    validate: (value) => value === password || 'Passwords do not match',
                                })}
                                type="password"
                                id="confirmPassword"
                                className={`input ${errors.confirmPassword ? 'input-error' : ''}`}
                                placeholder="••••••••"
                            />
                            {errors.confirmPassword && (
                                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
