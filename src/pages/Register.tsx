import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Copy, Download, Check } from 'lucide-react';

const Register: React.FC = () => {
    const [accountNumber, setAccountNumber] = useState('');
    const [isGenerated, setIsGenerated] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    const navigate = useNavigate();
    const { session } = useAuth();

    if (session && !isGenerated) {
        navigate('/');
        return null;
    }

    const generateAccountNumber = () => {
        setIsGenerated(true);
        setIsAnimating(true);

        let finalActNum = '';
        for (let i = 0; i < 16; i++) {
            finalActNum += Math.floor(Math.random() * 10).toString();
        }

        let iterations = 0;
        const maxIterations = 48; // 16 digits * 3 iterations per digit

        const interval = setInterval(() => {
            let currentNum = '';
            for (let i = 0; i < 16; i++) {
                if (i < Math.floor(iterations / 3)) {
                    currentNum += finalActNum[i];
                } else {
                    currentNum += Math.floor(Math.random() * 10).toString();
                }
            }
            setAccountNumber(currentNum);

            iterations++;
            if (iterations >= maxIterations) {
                clearInterval(interval);
                setAccountNumber(finalActNum);
                setIsAnimating(false);
            }
        }, 40);
    };

    const formatAccountNumber = (num: string) => {
        if (!num) return '';
        return num.replace(/(.{4})/g, '$1 ').trim();
    };

    const handleCopy = () => {
        const textToCopy = accountNumber;

        // Modern Clipboard API (Requires HTTPS)
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        } else {
            // Fallback for non-HTTPS or older browsers
            try {
                const textArea = document.createElement("textarea");
                textArea.value = textToCopy;

                // Ensure it's not visible but still reachable
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                textArea.style.top = "0";
                document.body.appendChild(textArea);

                textArea.focus();
                textArea.select();

                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);

                if (successful) {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                }
            } catch (err) {
                console.error('Fallback copy failed: ', err);
            }
        }
    };

    const handleDownload = () => {
        const element = document.createElement("a");
        const file = new Blob([`Flixify Hesap Numarası: ${formatAccountNumber(accountNumber)}\nLütfen bu numarayı kaybetmeyin, şifre sıfırlama seçeneği yoktur.`], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = "flixify-hesap.txt";
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const handleRegister = async () => {
        setLoading(true);
        setError('');

        try {
            const fakeEmail = `${accountNumber}@anon.flixify.com`;
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: fakeEmail,
                password: accountNumber,
                options: {
                    data: {
                        full_name: 'Anonim Kullanıcı',
                        raw_account_number: accountNumber
                    }
                }
            });

            if (signUpError) {
                console.error('Supabase Kayıt Hatası:', signUpError);
                if (signUpError.message.includes('rate limit')) {
                    setError('Çok fazla hesap oluşturma denemesi yapıldı. Güvenlik nedeniyle lütfen 1-2 dakika bekleyin veya Supabase panelinden limiti artırın.');
                } else {
                    setError(signUpError.message);
                }
                setLoading(false);
                return;
            }

            // Kullanıcı başarıyla oluşturuldu, şimdi profiles tablosuna ekle
            if (signUpData.user) {
                const fakeEmail = `${accountNumber}@anon.flixify.com`;
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert({
                        id: signUpData.user.id,
                        email: fakeEmail,
                        full_name: 'Anonim Kullanıcı',
                        account_number: accountNumber,
                        is_admin: false,
                        max_concurrent_streams: 1,
                        subscription_status: 'trial'
                    });

                if (profileError) {
                    console.error('Profil oluşturma hatası:', profileError);
                    // Kullanıcı oluştu ama profil hatası - yine de devam et
                }
            }

            navigate('/');
        } catch (err) {
            setError('Hesap oluşturulurken beklenmeyen bir hata oluştu.');
            setLoading(false);
        }
    };

    const heroBg = 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=3540&auto=format&fit=crop';

    return (
        <div className="min-h-screen relative flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background">
            {/* Background Layer */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent z-10" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-black/60 to-transparent z-10" />
                <img 
                    src={heroBg} 
                    alt="" 
                    className="w-full h-full object-cover opacity-40 mix-blend-luminosity" 
                />
            </div>

            {/* Main Container - Compact Centered */}
            <div className="w-full max-w-md mx-auto relative z-20">
                <div className="bg-surface/90 py-10 px-8 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-xl text-center">
                    {!isGenerated ? (
                        <div className="text-center">
                            <h2 className="text-white text-2xl font-black mb-2 uppercase tracking-wide">Manuel Kurulum</h2>
                            <p className="text-gray-400 text-sm mb-8 font-medium">İleri düzey kullanıcılar ve tam gizlilik arayanlar için.</p>

                            <button
                                onClick={generateAccountNumber}
                                className="w-full flex justify-center py-4 px-4 shadow-lg text-sm font-black text-white bg-primary hover:bg-primary-hover transition-all uppercase tracking-wider mb-6 rounded"
                            >
                                Hesap Numarası Oluştur
                            </button>

                            <div className="mt-6 text-center text-gray-400 text-sm font-medium">
                                <p>
                                    Zaten bir hesabınız var mı?{' '}
                                    <Link to="/giris-yap" className="font-bold text-white border-b-2 border-primary hover:text-primary transition-colors pb-0.5">
                                        BURADAN GİRİŞ YAPIN
                                    </Link>
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center">
                            <h2 className="text-white text-xl font-black mb-2 uppercase tracking-wide">Bu, hesap numaranızdır.</h2>
                            <p className="text-gray-400 text-sm mb-8 font-medium">
                                Giriş yaparken ihtiyacınız olacağı için bu bilgiyi kaydedin.
                            </p>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/50 p-4 rounded mb-6 text-red-400 text-sm font-bold">
                                    {error}
                                </div>
                            )}

                            <div className={`bg-background/80 border-2 ${isAnimating ? 'border-primary/50' : 'border-white/20'} border-dashed p-5 mb-6 text-center rounded`}>
                                <span className={`text-2xl tracking-widest font-mono font-bold transition-colors ${isAnimating ? 'text-primary' : 'text-white'}`}>
                                    {formatAccountNumber(accountNumber)}
                                </span>
                            </div>

                            <div className="flex gap-3 mb-8">
                                <button
                                    onClick={handleCopy}
                                    disabled={isAnimating}
                                    className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-black py-3 px-4 uppercase text-sm transition-colors shadow-sm rounded disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
                                >
                                    {copied ? <Check size={18} /> : <Copy size={18} />}
                                    Kopyala
                                </button>
                                <button
                                    onClick={handleDownload}
                                    disabled={isAnimating}
                                    className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-black py-3 px-4 uppercase text-sm transition-colors shadow-sm rounded disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
                                >
                                    <Download size={18} />
                                    İndir
                                </button>
                            </div>

                            <div className={`mb-6 text-left transition-opacity ${isAnimating ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                                <p className="text-white text-sm font-bold mb-3">Hesap numaranızı kaydettiniz mi?</p>
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isSaved}
                                        onChange={(e) => setIsSaved(e.target.checked)}
                                        className="w-5 h-5 mt-0.5 border-2 border-white/30 rounded bg-background text-primary focus:ring-0 cursor-pointer"
                                    />
                                    <span className="text-gray-300 text-sm font-medium">
                                        Hesap numaramı kaydettiğimi onaylıyorum.
                                    </span>
                                </label>
                            </div>

                            <button
                                onClick={handleRegister}
                                disabled={!isSaved || loading || isAnimating}
                                className="w-full flex justify-center py-4 px-4 shadow-lg text-sm font-black text-white bg-primary hover:bg-primary-hover transition-all uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed rounded"
                            >
                                {loading ? 'BAĞLANILIYOR...' : 'OTURUM AÇ'}
                            </button>

                            <p className="text-center text-xs text-gray-500 mt-4 font-medium uppercase tracking-wide">
                                Lütfen GİZLİLİK ŞARTLARIMIZI okuyun. Yalnızca bir sayfadır.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Register;
