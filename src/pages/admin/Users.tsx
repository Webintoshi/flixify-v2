import { useState, useEffect } from 'react';
import { Search, Shield, Ban, CheckCircle, Save, X, Calendar, Link as LinkIcon, Users as UsersIcon, Monitor } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Profile } from '../../contexts/AuthContext';

// Extended Profile with concurrent streams
interface ExtendedProfile extends Profile {
    max_concurrent_streams?: number;
}

export default function Users() {
    const [users, setUsers] = useState<ExtendedProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Edit Modal State
    const [editingUser, setEditingUser] = useState<ExtendedProfile | null>(null);
    const [editM3u, setEditM3u] = useState('');
    const [editExpiry, setEditExpiry] = useState('');
    const [editMaxStreams, setEditMaxStreams] = useState(2);
    const [updating, setUpdating] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_all_profiles');

            if (error) throw error;

            let profiles = data || [];

            // Apply search filter locally
            if (searchTerm) {
                const term = searchTerm.replace(/\s/g, '').toLowerCase();
                profiles = profiles.filter((p: any) =>
                    p.account_number?.toLowerCase().includes(term)
                );
            }

            // Sort by created_at descending
            profiles.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            setUsers(profiles);
        } catch (err) {
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [searchTerm]);

    const handleBanToggle = async (user: ExtendedProfile) => {
        if (!confirm(`${user.account_number} numaralı hesabı ${user.is_banned ? 'aktif etmek' : 'yasaklamak'} istediğinize emin misiniz?`)) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_banned: !user.is_banned })
                .eq('id', user.id);

            if (error) throw error;
            fetchUsers();
        } catch (err) {
            alert('Hata oluştu: ' + (err as any).message);
        }
    };

    const openEditModal = (user: ExtendedProfile) => {
        setEditingUser(user);
        setEditM3u(user.m3u_url || '');
        setEditExpiry(user.subscription_expiry ? new Date(user.subscription_expiry).toISOString().split('T')[0] : '');
        setEditMaxStreams(user.max_concurrent_streams || 2);
    };

    const handleUpdateUser = async () => {
        if (!editingUser) return;
        setUpdating(true);

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    m3u_url: editM3u.trim(),
                    subscription_expiry: editExpiry ? new Date(editExpiry).toISOString() : null,
                    max_concurrent_streams: Math.max(1, Math.min(5, editMaxStreams)),
                })
                .eq('id', editingUser.id);

            if (error) throw error;
            setEditingUser(null);
            fetchUsers();
        } catch (err) {
            alert('Hata oluştu: ' + (err as any).message);
        } finally {
            setUpdating(false);
        }
    };

    // Quick add months helper
    const addMonths = (months: number) => {
        const date = editExpiry ? new Date(editExpiry) : new Date();
        date.setMonth(date.getMonth() + months);
        setEditExpiry(date.toISOString().split('T')[0]);
    };

    return (
        <div className="max-w-7xl mx-auto animation-fade-in">
            <header className="mb-10 lg:mb-14 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl lg:text-5xl font-black tracking-tight mb-3 uppercase bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">Kullanıcı Yönetimi</h1>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs lg:text-sm">Hesapları incele, M3U ata, süre ve cihaz limiti belirle</p>
                </div>

                <div className="relative w-full md:w-96 group">
                    <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl group-hover:bg-primary/30 transition-colors -z-10" />
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-primary transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Hesap Numarası Ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-14 pr-6 py-4 bg-surface/80 backdrop-blur-xl border border-white/10 rounded-2xl focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all font-mono tracking-wider text-sm shadow-2xl"
                    />
                </div>
            </header>

            <div className="bg-surface/40 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl">
                <div className="overflow-x-auto custom-scrollbar min-h-[400px]">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-white/5 bg-black/40">
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 rounded-tl-3xl">Kullanıcı / Hesap</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-center">Durum</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Abonelik Süresi</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-center">Ekran Limiti</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">M3U Bağlantısı</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-right rounded-tr-3xl">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-8 py-32 text-center">
                                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto shadow-[0_0_30px_rgba(var(--primary),0.5)]"></div>
                                    </td>
                                </tr>
                            ) : users.length > 0 ? (
                                users.map((user) => (
                                    <tr key={user.id} className="group hover:bg-white/5 transition-colors cursor-default">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-inner">
                                                    {user.account_number?.substring(0, 1)}
                                                </div>
                                                <div>
                                                    <div className="font-mono text-base font-black tracking-wider text-white group-hover:text-primary transition-colors">
                                                        {user.account_number?.replace(/(\d{4})/g, '$1 ').trim()}
                                                    </div>
                                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2">
                                                        <Calendar size={10} />
                                                        {new Date(user.created_at).toLocaleDateString('tr-TR')}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${user.is_banned ? 'bg-red-500/10 text-red-500 border-red-500/30' : 'bg-green-500/10 text-green-500 border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]'}`}>
                                                {user.is_banned ? <Ban size={12} strokeWidth={3} /> : <CheckCircle size={12} strokeWidth={3} />}
                                                {user.is_banned ? 'YASAKLI' : 'AKTİF'}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className={`text-sm font-black ${!user.subscription_expiry ? 'text-green-500' : new Date(user.subscription_expiry) < new Date() ? 'text-red-500' : 'text-white'}`}>
                                                    {user.subscription_expiry ? new Date(user.subscription_expiry).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'SÜRESİZ ERİŞİM'}
                                                </span>
                                                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                                                    {user.subscription_expiry ? (new Date(user.subscription_expiry) < new Date() ? 'SÜRESİ DOLDU' : 'DEVAM EDİYOR') : 'LİMİTSİZ'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-full text-xs font-bold">
                                                <Monitor size={12} />
                                                {user.max_concurrent_streams || 2} Ekran
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            {user.m3u_url ? (
                                                <div className="flex items-center gap-2 text-primary bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20 hover:bg-primary/20 transition-colors w-fit max-w-[200px]" title={user.m3u_url}>
                                                    <LinkIcon size={14} className="shrink-0" />
                                                    <span className="text-xs font-bold truncate">{user.m3u_url}</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] bg-white/5 px-3 py-1 rounded border border-white/5">EŞLEŞTİRİLMEDİ</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-3 opacity-50 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleBanToggle(user)}
                                                    className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all border ${user.is_banned ? 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20 hover:scale-110' : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20 hover:scale-110'}`}
                                                    title={user.is_banned ? 'Yasağı Kaldır' : 'Yasakla'}
                                                >
                                                    {user.is_banned ? <Shield size={18} /> : <Ban size={18} />}
                                                </button>
                                                <button
                                                    onClick={() => openEditModal(user)}
                                                    className="px-5 py-2.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl transition-all font-black uppercase tracking-widest text-xs border border-primary/20 hover:shadow-[0_0_20px_rgba(var(--primary),0.4)]"
                                                >
                                                    YÖNET
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-8 py-32 text-center">
                                        <div className="flex flex-col items-center justify-center opacity-40">
                                            <UsersIcon size={48} className="mb-4 text-gray-400" />
                                            <span className="text-gray-400 font-bold uppercase tracking-widest text-sm">Hiçbir kullanıcı bulunamadı.</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={() => setEditingUser(null)} />

                    <div className="bg-surface border border-white/10 w-full max-w-xl rounded-3xl shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-blue-500 to-primary" />

                        <div className="p-8 pb-6 border-b border-white/5 flex justify-between items-start bg-white/5">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-2">Hesap Yönetimi</h3>
                                <div className="flex items-center gap-3">
                                    <div className="bg-primary/20 px-3 py-1 rounded text-primary font-mono text-sm tracking-widest font-bold border border-primary/20">
                                        {editingUser.account_number}
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setEditingUser(null)} className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-8 space-y-8">
                            {/* M3U URL */}
                            <div className="space-y-4">
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-white mb-3">
                                        <LinkIcon size={14} className="text-primary" />
                                        M3U Listesi URL
                                    </label>
                                    <input
                                        type="url"
                                        value={editM3u}
                                        onChange={(e) => setEditM3u(e.target.value)}
                                        placeholder="http://flixify-cdn.com/get.php?username=..."
                                        className="w-full px-5 py-4 bg-black/50 border border-white/10 rounded-2xl focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all text-sm font-medium text-white placeholder:text-gray-600 shadow-inner"
                                    />
                                    <p className="mt-2 text-[10px] text-gray-500 font-bold uppercase tracking-wider ml-1">
                                        Kullanıcıya özel IPTV listesinin M3U bağlantısı.
                                    </p>
                                </div>
                            </div>

                            {/* Subscription Date */}
                            <div className="space-y-4">
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-white mb-3">
                                        <Calendar size={14} className="text-primary" />
                                        Abonelik Bitiş Tarihi
                                    </label>
                                    <input
                                        type="date"
                                        value={editExpiry}
                                        onChange={(e) => setEditExpiry(e.target.value)}
                                        className="w-full px-5 py-4 bg-black/50 border border-white/10 rounded-2xl focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all text-sm font-bold text-white [color-scheme:dark] shadow-inner"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => addMonths(1)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-black uppercase tracking-wider rounded-xl transition-colors border border-white/5">+1 AY</button>
                                    <button onClick={() => addMonths(3)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-black uppercase tracking-wider rounded-xl transition-colors border border-white/5">+3 AY</button>
                                    <button onClick={() => addMonths(12)} className="flex-1 py-3 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-black uppercase tracking-wider rounded-xl transition-colors border border-primary/20">+1 YIL</button>
                                </div>
                            </div>

                            {/* Concurrent Streams Limit */}
                            <div className="space-y-4">
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-white mb-3">
                                        <Monitor size={14} className="text-primary" />
                                        Eşzamanlı Ekran Limiti
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min="1"
                                            max="5"
                                            value={editMaxStreams}
                                            onChange={(e) => setEditMaxStreams(parseInt(e.target.value))}
                                            className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                                        />
                                        <span className="w-12 text-center text-2xl font-black text-primary">
                                            {editMaxStreams}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-[10px] text-gray-500 font-bold uppercase tracking-wider ml-1">
                                        Aynı anda izlenebilecek maksimum cihaz sayısı (1-5).
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-black/40 border-t border-white/5 flex gap-4">
                            <button
                                onClick={() => setEditingUser(null)}
                                className="flex-1 py-4 font-black uppercase tracking-widest text-xs text-white bg-transparent hover:bg-white/5 border border-white/10 rounded-2xl transition-colors"
                            >
                                VAZGEÇ
                            </button>
                            <button
                                onClick={handleUpdateUser}
                                disabled={updating}
                                className="flex-[2] py-4 bg-primary hover:bg-primary-hover text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(var(--primary),0.3)] disabled:opacity-50"
                            >
                                {updating ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Save size={18} />
                                        AYARLARI KAYDET
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
