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
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
            
            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />

            <div className="w-full max-w-md relative z-10">
                {/* Logo Section */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center gap-3 mb-6">
                        <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 shadow-[0_0_30px_rgba(var(--primary),0.2)]">
                            <Tv size={32} className="text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tight">
                                FLIXIFY <span className="text-primary">ADMIN</span>
                            </h1>
                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">
                                Yönetici Paneli
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-gray-400">
                        <Shield size={14} className="text-primary" />
                        <span className="text-xs font-bold uppercase tracking-widest">Güvenli Giriş</span>
                    </div>
                </div>

                {/* Login Card */}
                <div className="bg-surface/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                            <span className="text-red-400 text-sm font-medium">{error}</span>
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleLogin}>
                        {/* Email Field */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-gray-400 ml-1">
                                <Mail size={14} className="text-primary" />
                                E-posta Adresi
                            </label>
                            <div className="relative group">
                                <input
                                    type="email"
                                    required
                                    placeholder="admin@flixify.com"
                                    className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 pl-12 text-white placeholder:text-gray-600 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" size={18} />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-gray-400 ml-1">
                                <Lock size={14} className="text-primary" />
                                Şifre
                            </label>
                            <div className="relative group">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    placeholder="••••••••"
                                    className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 pl-12 pr-12 text-white placeholder:text-gray-600 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" size={18} />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-primary-hover text-white font-black uppercase tracking-widest py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    GİRİŞ YAPILIYOR...
                                </>
                            ) : (
                                <>
                                    <Lock size={18} className="group-hover:scale-110 transition-transform" />
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
                <div className="mt-8 text-center">
                    <a 
                        href="/" 
                        className="text-gray-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                    >
                        ← Platforma Dön
                    </a>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
