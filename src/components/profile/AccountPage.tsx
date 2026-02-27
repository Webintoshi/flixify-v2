import { useState, useEffect } from 'react';
import { Shield, Clock, CheckCircle2, Copy } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function AccountPage() {
    const { user } = useAuth();
    const [accountNumber, setAccountNumber] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (user?.user_metadata?.raw_account_number) {
            setAccountNumber(user.user_metadata.raw_account_number);
        } else if (user?.email) {
            // Fallback: extract number from email if metadata is missing
            const match = user.email.match(/^(\d+)@/);
            if (match) setAccountNumber(match[1]);
        }
    }, [user]);

    const handleCopy = () => {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(accountNumber).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        } else {
            const textArea = document.createElement("textarea");
            textArea.value = accountNumber;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-10">
                <h1 className="text-4xl font-black tracking-tight mb-2">HESAP</h1>
                <div className="flex items-center gap-2 text-primary font-bold">
                    <Clock size={16} />
                    <span className="text-sm uppercase tracking-widest">Şu tarihe kadar ödendi: SÜRE SONA ERDİ</span>
                </div>
            </header>

            <div className="space-y-8">
                {/* Account Number Card */}
                <section className="bg-surface/50 border border-white/10 rounded-3xl p-8 backdrop-blur-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Shield size={120} />
                    </div>

                    <h2 className="text-gray-400 text-xs font-black uppercase tracking-widest mb-6">Hesap Numaranız</h2>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="font-mono text-3xl md:text-4xl font-black tracking-[0.2em] text-white">
                            {accountNumber.replace(/(\d{4})/g, '$1 ').trim()}
                        </div>

                        <button
                            onClick={handleCopy}
                            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold transition-all duration-300 ${copied ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-white text-black hover:bg-gray-200'
                                }`}
                        >
                            {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                            {copied ? 'KOPYALANDI' : 'KOPYALA'}
                        </button>
                    </div>

                    <p className="mt-8 text-gray-400 text-sm leading-relaxed max-w-xl font-medium">
                        Bu numara hem kullanıcı adınız hem de şifrenizdir. Lütfen kaybetmeyin,
                        güvenliğiniz için bu numarayı başka kimseyle paylaşmayın.
                    </p>
                </section>

                {/* Security Notice */}
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex gap-4 items-start">
                    <div className="bg-primary/20 p-2 rounded-lg text-primary">
                        <Shield size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-white mb-1">Gizlilik Odaklı Altyapı</h4>
                        <p className="text-gray-400 text-sm leading-relaxed font-medium">
                            Flixify, Mullvad tabanlı anonimlik protokollerini kullanır. Hiçbir kişisel veri, IP adresi veya e-posta
                            tarafımızca saklanmaz. Sizinle bağlantımız sadece bu 16 haneli numaradır.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AccountPage;
