import { CreditCard, Zap, Receipt, ExternalLink } from 'lucide-react';

interface PricingPlan {
    id: string;
    months: number;
    price: string;
    description: string;
    popular?: boolean;
}

const plans: PricingPlan[] = [
    { id: '1-month', months: 1, price: '₺149', description: '30 Gün Boyunca Kesintisiz Erişim' },
    { id: '3-months', months: 3, price: '₺399', description: '90 Gün Boyunca Kesintisiz Erişim', popular: true },
    { id: '12-months', months: 12, price: '₺1299', description: '365 Gün Boyunca Kesintisiz Erişim' },
];

export function PlansPage() {
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
                        <div className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-6">{plan.months * 30} GÜN</div>

                        <div className="mb-8">
                            <span className="text-4xl font-black">{plan.price}</span>
                            <span className="text-gray-400 text-sm font-bold ml-2">/tek sefer</span>
                        </div>

                        <p className="text-gray-400 text-sm mb-10 flex-grow font-medium">
                            {plan.description}
                        </p>

                        <button className={`w-full py-4 rounded-2xl font-black uppercase tracking-wider transition-all duration-300 ${plan.popular ? 'bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/20' : 'bg-white/10 text-white hover:bg-white/20'
                            }`}>
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
