import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Lock, Mail, Tv, AlertCircle, Eye, EyeOff, Shield } from 'lucide-react';

const AdminLogin: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const navigate = useNavigate();
    const { session } = useAuth();

    // If already logged in, go to dashboard
    if (session) {
        navigate('/admin/dashboard', { replace: true });
        return null;
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) {
                setError('Giriş başarısız. E-posta veya şifre hatalı.');
            } else if (data.user) {
                // Check if user is admin
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('is_admin')
                    .eq('id', data.user.id)
                    .single();

                if (profileError || !profile?.is_admin) {
                    setError('Bu hesap admin yetkisine sahip değil.');
                    await supabase.auth.signOut();
                } else {
                    navigate('/admin/dashboard', { replace: true });
                }
            }
        } catch (err) {
            setError('Giriş sırasında beklenmeyen bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-1/4 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-primary/10 rounded-full blur-[120px] sm:blur-[150px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-[250px] h-[250px] sm:w-[400px] sm:h-[400px] bg-blue-500/10 rounded-full blur-[100px] sm:blur-[120px] pointer-events-none" />
            
            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] sm:bg-[size:50px_50px] pointer-events-none" />

            <div className="w-full max-w-md relative z-10">
                {/* Logo Section */}
                <div className="text-center mb-8 sm:mb-10">
                    <div className="inline-flex items-center justify-center gap-3 mb-6">
                        <div className="p-3 sm:p-4 bg-primary/10 rounded-2xl border border-primary/20 shadow-[0_0_30px_rgba(229,9,20,0.2)]">
                            <Tv size={28} className="sm:w-8 sm:h-8 text-primary" aria-hidden="true" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                FLIXIFY <span className="text-primary">ADMIN</span>
                            </h1>
                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">
                                Yönetici Paneli
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-gray-400">
                        <Shield size={14} className="text-primary" aria-hidden="true" />
                        <span className="text-xs font-bold uppercase tracking-widest">Güvenli Giriş</span>
                    </div>
                </div>

                {/* Login Card */}
                <div className="bg-surface/60 backdrop-blur-2xl border border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl">
                    {error && (
                        <div 
                            className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl sm:rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2"
                            role="alert"
                            aria-live="polite"
                        >
                            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
                            <span className="text-red-400 text-sm font-medium">{error}</span>
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleLogin}>
                        {/* Email Field */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-gray-400 ml-1">
                                <Mail size={14} className="text-primary" aria-hidden="true" />
                                E-posta Adresi
                            </label>
                            <div className="relative group">
                                <input
                                    type="email"
                                    required
                                    autoComplete="email"
                                    placeholder="admin@flixify.com"
                                    className="w-full bg-black/50 border border-white/10 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3.5 sm:py-4 pl-11 sm:pl-12 text-white placeholder:text-gray-600 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                                <Mail className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" size={18} />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-gray-400 ml-1">
                                <Lock size={14} className="text-primary" aria-hidden="true" />
                                Şifre
                            </label>
                            <div className="relative group">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    className="w-full bg-black/50 border border-white/10 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3.5 sm:py-4 pl-11 sm:pl-12 pr-11 sm:pr-12 text-white placeholder:text-gray-600 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <Lock className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" size={18} />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 sm:right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors focus:outline-none focus-visible:text-primary"
                                    aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-primary-hover text-white font-black uppercase tracking-widest py-3.5 sm:py-4 rounded-xl sm:rounded-2xl transition-all duration-200 shadow-[0_0_20px_rgba(229,9,20,0.3)] hover:shadow-[0_0_30px_rgba(229,9,20,0.5)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    GİRİŞ YAPILIYOR...
                                </>
                            ) : (
                                <>
                                    <Lock size={18} className="group-hover:scale-110 transition-transform duration-200" aria-hidden="true" />
                                    GİRİŞ YAP
                                </>
                            )}
                        </button>
                    </form>

                    {/* Security Note */}
                    <div className="mt-8 pt-6 border-t border-white/5">
                        <div className="flex items-start gap-3 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                            <Shield size={14} className="text-primary shrink-0 mt-0.5" />
                            <span>
                                Admin paneline sadece yetkili kullanıcılar erişebilir. 
                                Tüm giriş denemeleri kayıt altına alınmaktadır.
                            </span>
                        </div>
                    </div>
                </div>

                {/* Back Link */}
                <div className="mt-6 sm:mt-8 text-center">
                    <a 
                        href="/" 
                        className="text-gray-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors inline-flex items-center justify-center gap-2 focus:outline-none focus-visible:text-primary"
                    >
                        <span aria-hidden="true">←</span> Platforma Dön
                    </a>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
