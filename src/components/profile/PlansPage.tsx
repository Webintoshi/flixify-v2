import { useState, useEffect } from 'react';
import { CreditCard, Zap, Receipt, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PricingPlan {
    id: string;
    name: string;
    months: number;
    price: string;
    price_monthly: number;
    description: string;
    popular: boolean;
    featured: boolean;
    max_concurrent_streams: number;
    max_devices: number;
}

export function PlansPage() {
    const [plans, setPlans] = useState<PricingPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('plans')
                .select('*')
                .eq('is_active', true)
                .eq('is_public', true)
                .order('sort_order', { ascending: true })
                .order('price', { ascending: true });

            if (fetchError) throw fetchError;

            if (data) {
                const formattedPlans: PricingPlan[] = data.map(plan => ({
                    id: plan.id,
                    name: plan.name,
                    months: plan.months || 1,
                    price: `₺${plan.price || plan.price_monthly || 0}`,
                    price_monthly: plan.price_monthly || plan.price || 0,
                    description: plan.description || `${plan.months || 1} ay boyunca kesintisiz erişim`,
                    popular: plan.is_popular || false,
                    featured: plan.is_featured || false,
                    max_concurrent_streams: plan.max_concurrent_streams || 1,
                    max_devices: plan.max_devices || 1
                }));
                setPlans(formattedPlans);
            }
        } catch (err) {
            console.error('Paketler yüklenirken hata:', err);
            setError('Paketler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.');
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = (planId: string) => {
        // Ödeme sayfasına yönlendirme
        window.location.href = `/odeme?plan=${planId}`;
    };

    if (loading) {
        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <header className="mb-10">
                    <h1 className="text-4xl font-black tracking-tight mb-2">PAKETLER</h1>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Hesabınıza süre ekleyin</p>
                </header>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <header className="mb-10">
                    <h1 className="text-4xl font-black tracking-tight mb-2">PAKETLER</h1>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Hesabınıza süre ekleyin</p>
                </header>
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
                    <p className="text-red-400 font-medium">{error}</p>
                    <button 
                        onClick={fetchPlans}
                        className="mt-4 px-6 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-colors"
                    >
                        Tekrar Dene
                    </button>
                </div>
            </div>
        );
    }

    if (plans.length === 0) {
        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <header className="mb-10">
                    <h1 className="text-4xl font-black tracking-tight mb-2">PAKETLER</h1>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Hesabınıza süre ekleyin</p>
                </header>
                <div className="bg-surface/50 border border-white/10 rounded-2xl p-8 text-center">
                    <p className="text-gray-400">Şu anda aktif paket bulunmamaktadır.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-10">
                <h1 className="text-4xl font-black tracking-tight mb-2">PAKETLER</h1>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Hesabınıza süre ekleyin</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {plans.map((plan) => (
                    <div
                        key={plan.id}
                        className={`relative bg-surface/50 border rounded-3xl p-8 flex flex-col transition-all duration-300 hover:scale-[1.02] ${plan.popular ? 'border-primary shadow-2xl shadow-primary/10' : 'border-white/10'
                            }`}
                    >
                        {plan.popular && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">
                                En Çok Seçilen
                            </div>
                        )}

                        <h3 className="text-2xl font-black mb-1">{plan.months} AY</h3>
                        <div className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">{plan.months * 30} GÜN</div>
                        
                        <div className="text-gray-500 text-xs mb-6">
                            {plan.max_concurrent_streams} Ekran • {plan.max_devices} Cihaz
                        </div>

                        <div className="mb-4">
                            <span className="text-4xl font-black">{plan.price}</span>
                            <span className="text-gray-400 text-sm font-bold ml-2">/tek sefer</span>
                        </div>

                        <div className="mb-2 text-sm text-gray-400">
                            Ayda ₺{Math.round(plan.price_monthly / plan.months)}
                        </div>

                        <p className="text-gray-400 text-sm mb-10 flex-grow font-medium">
                            {plan.description}
                        </p>

                        <button 
                            onClick={() => handlePurchase(plan.id)}
                            className={`w-full py-4 rounded-2xl font-black uppercase tracking-wider transition-all duration-300 ${plan.popular ? 'bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/20' : 'bg-white/10 text-white hover:bg-white/20'
                                }`}
                        >
                            SATIN AL
                        </button>
                    </div>
                ))}
            </div>

            {/* Payment Methods */}
            <div className="bg-surface/30 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
                <h4 className="text-gray-400 text-xs font-black uppercase tracking-widest mb-8 text-center">ÖDEME YÖNTEMLERİ</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
                    <div className="flex flex-col items-center gap-3 group grayscale hover:grayscale-0 transition-all">
                        <div className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-2xl group-hover:bg-primary/10">
                            <CreditCard className="text-gray-400 group-hover:text-primary transition-colors" />
                        </div>
                        <span className="text-xs font-bold text-gray-500 group-hover:text-gray-300">Kredi Kartı</span>
                    </div>
                    <div className="flex flex-col items-center gap-3 group grayscale hover:grayscale-0 transition-all">
                        <div className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-2xl group-hover:bg-primary/10">
                            <Zap className="text-gray-400 group-hover:text-primary transition-colors" />
                        </div>
                        <span className="text-xs font-bold text-gray-500 group-hover:text-gray-300">Kripto Para</span>
                    </div>
                    <div className="flex flex-col items-center gap-3 group grayscale hover:grayscale-0 transition-all">
                        <div className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-2xl group-hover:bg-primary/10">
                            <Receipt className="text-gray-400 group-hover:text-primary transition-colors" />
                        </div>
                        <span className="text-xs font-bold text-gray-500 group-hover:text-gray-300">Banka Havalesi</span>
                    </div>
                    <div className="flex flex-col items-center gap-3 group grayscale hover:grayscale-0 transition-all">
                        <div className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-2xl group-hover:bg-primary/10">
                            <ExternalLink className="text-gray-400 group-hover:text-primary transition-colors" />
                        </div>
                        <span className="text-xs font-bold text-gray-500 group-hover:text-gray-300">Diğer</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PlansPage;
