import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Lock, Mail, Tv } from 'lucide-react';

const AdminLogin: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const { session } = useAuth();

    // If already logged in, go to dashboard
    if (session) {
        navigate('/admin/dashboard');
        return null;
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) {
                setError('Giriş başarısız. E-posta veya şifre hatalı.');
            } else {
                navigate('/');
            }
        } catch (err) {
            setError('Giriş sırasında beklenmeyen bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-white">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
                <div className="flex items-center justify-center gap-2 text-primary mb-4">
                    <Tv size={32} />
                    <span className="text-2xl font-bold">FLIXIFY ADMIN</span>
                </div>
                <h2 className="text-xl font-bold">Yönetici Girişi</h2>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md bg-zinc-900 p-8 rounded-lg border border-zinc-800">
                {error && (
                    <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded mb-4 text-sm">
                        {error}
                    </div>
                )}

                <form className="space-y-6" onSubmit={handleLogin}>
                    <div>
                        <label className="block text-sm font-medium text-gray-400">E-posta</label>
                        <div className="mt-1 relative">
                            <input
                                type="email"
                                required
                                className="w-full bg-black border border-zinc-700 rounded p-2.5 pl-10 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <Mail className="absolute left-3 top-3 text-gray-500" size={16} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400">Şifre</label>
                        <div className="mt-1 relative">
                            <input
                                type="password"
                                required
                                className="w-full bg-black border border-zinc-700 rounded p-2.5 pl-10 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <Lock className="absolute left-3 top-3 text-gray-500" size={16} />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-red-700 text-white font-bold py-2.5 rounded transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
