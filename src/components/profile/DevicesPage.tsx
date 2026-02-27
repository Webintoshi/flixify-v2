import { Clock } from 'lucide-react';

export function DevicesPage() {
    return (
        <div className="animate-in fade-in duration-500">
            <header className="mb-10">
                <h1 className="text-4xl font-black tracking-tight mb-2">CİHAZLAR</h1>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Bağlı cihazlarınızı yönetin</p>
            </header>

            <div className="flex flex-col items-center justify-center py-20">
                <section className="p-12 bg-white/5 border border-white/10 rounded-full mb-8">
                    <Clock size={48} className="text-primary opacity-50" />
                </section>
                <h3 className="text-2xl font-black mb-2 uppercase tracking-tight">PEK YAKINDA</h3>
                <p className="text-gray-400 font-bold max-w-sm text-center">
                    Bu bölüm şu an geliştirme aşamasındadır. Çok yakında tüm özellikleri ile aktif edilecektir.
                </p>
            </div>
        </div>
    );
}

export default DevicesPage;
