import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Tv } from 'lucide-react';

const Login: React.FC = () => {
    const [accountNumber, setAccountNumber] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const { session } = useAuth();

    if (session) {
        navigate('/');
        return null;
    }

    const formatInput = (val: string) => {
        const raw = val.replace(/\D/g, '').slice(0, 16);
        return raw.replace(/(.{4})/g, '$1 ').trim();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAccountNumber(formatInput(e.target.value));
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const rawNumber = accountNumber.replace(/\s/g, '');
        if (rawNumber.length !== 16) {
            setError('Hesap numarası 16 haneli olmalıdır.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const fakeEmail = `${rawNumber}@anon.flixify.com`;
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: fakeEmail,
                password: rawNumber,
            });

            if (signInError) {
                setError('Geçersiz hesap numarası. Lütfen kontrol edip tekrar deneyin.');
            } else {
                if (window.location.protocol === 'https:') {
                    const { data: { session } } = await supabase.auth.getSession();
                    const accessToken = session?.access_token;
                    const refreshToken = session?.refresh_token;
                    window.location.href = `http://app.flixify.pro/#access_token=${accessToken}&refresh_token=${refreshToken}`;
                    return;
                }
                navigate('/');
            }
        } catch (err) {
            setError('Giriş sırasında beklenmeyen bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const heroBg = 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=3540&auto=format&fit=crop';

    return (
        <div className="min-h-screen relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background selection:bg-primary/30">
            {/* Background Layer */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent z-10" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-black/60 to-transparent z-10" />
                <img 
                    src={heroBg} 
                    alt="" 
                    className="w-full h-full object-cover opacity-40 mix-blend-luminosity" 
                    loading="eager"
                />
            </div>

            {/* Logo */}
            <div className="absolute top-6 left-4 sm:left-6 lg:left-12 z-20">
                <Link 
                    to="/" 
                    className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg"
                >
                    <Tv size={32} className="text-primary" aria-hidden="true" />
                    <span className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                        FLIXIFY <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded ml-1 align-top tracking-normal font-bold">PRO</span>
                    </span>
                </Link>
            </div>

            {/* Main Container - Always Centered */}
            <div className="w-full max-w-lg mx-auto relative z-20">
                <div className="bg-surface/95 py-8 sm:py-10 px-6 sm:px-10 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-xl">
                    <div className="text-center sm:text-left">
                        <h2 className="text-gray-400 text-xs sm:text-sm font-black mb-1 uppercase tracking-widest">Oturum Aç</h2>
                        <h3 className="text-white text-xl sm:text-2xl font-black mb-4 uppercase tracking-wide">Hesap Numaranızı Girin</h3>
                    </div>

                    <p className="text-gray-400 text-xs sm:text-sm mb-8 font-medium leading-relaxed text-center sm:text-left">
                        Hesap numaranız, hizmetimizi kullanabilmeniz için gereken tek tanımlayıcıdır. Güvenlik ve gizlilik nedeniyle giriş yaptıktan sonra bu bilgiyi tekrar gösteremiyoruz.
                    </p>

                    {error && (
                        <div 
                            className="bg-red-500/10 border border-red-500/50 p-4 rounded-lg mb-6 text-red-400 text-sm font-bold animate-in fade-in slide-in-from-top-2"
                            role="alert"
                            aria-live="polite"
                        >
                            {error}
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleLogin}>
                        <div>
                            <label htmlFor="accountNumber" className="block text-sm font-bold text-gray-300 mb-2">
                                Hesap numarası
                            </label>
                            <input
                                id="accountNumber"
                                name="accountNumber"
                                type="text"
                                inputMode="numeric"
                                autoComplete="off"
                                required
                                aria-describedby="accountNumber-help"
                                className="w-full px-4 text-white font-mono font-bold tracking-widest text-base sm:text-lg py-3.5 bg-background border border-white/20 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary focus:outline-none transition-all duration-200 placeholder:text-gray-600"
                                placeholder="0000 0000 0000 0000"
                                value={accountNumber}
                                onChange={handleChange}
                            />
                            <p id="accountNumber-help" className="sr-only">16 haneli hesap numaranızı girin</p>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading || accountNumber.replace(/\s/g, '').length !== 16}
                                className="w-full flex justify-center items-center py-4 px-4 shadow-lg text-sm font-black text-white bg-primary hover:bg-primary-hover active:scale-[0.98] transition-all duration-200 uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        BAĞLANILIYOR...
                                    </>
                                ) : 'OTURUM AÇ'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-gray-400 text-sm font-medium">
                            Flixify'da yeni misiniz?{' '}
                            <Link 
                                to="/kayit-ol" 
                                className="font-bold text-white border-b-2 border-primary hover:text-primary hover:border-primary transition-all duration-200 pb-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface rounded-sm"
                            >
                                HESAP OLUŞTURUN
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
