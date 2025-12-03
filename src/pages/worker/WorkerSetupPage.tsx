import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { CheckCircle, User, Lock, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WorkerSetupPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'verify' | 'setup' | 'complete'>('verify');
    const [email, setEmail] = useState('');
    const [formData, setFormData] = useState({
        full_name: '',
        password: '',
        confirmPassword: ''
    });

    useEffect(() => {
        // Check if user came from email invitation
        checkInvitationStatus();
    }, []);

    const checkInvitationStatus = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                setEmail(user.email || '');
                setFormData(prev => ({
                    ...prev,
                    full_name: user.user_metadata?.full_name || ''
                }));
                setStep('setup');
            }
        } catch (error) {
            console.error('Error checking invitation:', error);
        }
    };

    const handleSetupSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (formData.password.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }

        try {
            setLoading(true);

            // Update user password
            const { error: passwordError } = await supabase.auth.updateUser({
                password: formData.password,
                data: {
                    full_name: formData.full_name
                }
            });

            if (passwordError) throw passwordError;

            // Update user profile
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { error: profileError } = await supabase
                    .from('users')
                    .update({
                        full_name: formData.full_name
                    })
                    .eq('id', user.id);

                if (profileError) throw profileError;

                // Update worker profile
                const { error: workerError } = await supabase
                    .from('workers')
                    .update({
                        name: formData.full_name
                    })
                    .eq('user_id', user.id);

                if (workerError) throw workerError;
            }

            setStep('complete');
            toast.success('Account setup complete!');

            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (error: any) {
            console.error('Error setting up account:', error);
            toast.error(error.message || 'Failed to set up account');
        } finally {
            setLoading(false);
        }
    };

    if (step === 'complete') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="h-10 w-10 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Account Setup Complete!
                    </h1>
                    <p className="text-gray-600 mb-6">
                        Your worker account has been successfully set up. You can now log in to access your dashboard.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800">
                            Redirecting to login page...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="h-10 w-10 text-rose-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Welcome to CarenSisterlocks
                    </h1>
                    <p className="text-gray-600">
                        Complete your worker account setup
                    </p>
                </div>

                {step === 'verify' && (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Verifying your invitation...</p>
                    </div>
                )}

                {step === 'setup' && (
                    <form onSubmit={handleSetupSubmit} className="space-y-6">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                            <div className="flex items-start gap-2">
                                <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-blue-800">
                                        Email: {email}
                                    </p>
                                    <p className="text-xs text-blue-700 mt-1">
                                        This is your login email address
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Full Name *
                            </label>
                            <input
                                type="text"
                                required
                                className="input"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                placeholder="Enter your full name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Create Password *
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="password"
                                    required
                                    className="input pl-10"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="At least 8 characters"
                                    minLength={8}
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Must be at least 8 characters long
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Confirm Password *
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="password"
                                    required
                                    className="input pl-10"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    placeholder="Re-enter your password"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full"
                        >
                            {loading ? 'Setting up...' : 'Complete Setup'}
                        </button>

                        <p className="text-xs text-center text-gray-500">
                            After setup, you'll be redirected to the login page
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
}
