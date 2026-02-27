import { useState, useEffect, useMemo } from 'react';
import { 
    Search, Shield, Ban, CheckCircle, Save, X, Clock,
    Users as UsersIcon, Monitor, Filter,
    Download, CheckSquare, Square,
    RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAdmin } from '../../contexts/AdminContext';

interface User {
    id: string;
    account_number: string;
    created_at: string;
    role: string;
    subscription_status: string;
    subscription_ends_at: string | null;
    max_concurrent_streams: number;
    email: string;
    full_name: string | null;
}

interface Filters {
    status: 'all' | 'active' | 'banned';
    subscription: 'all' | 'active' | 'expired' | 'none';
    search: string;
}

export default function Users() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<Filters>({
        status: 'all',
        subscription: 'all',
        search: ''
    });
    const [showFilters, setShowFilters] = useState(false);
    
    // Edit Modal State
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editExpiry, setEditExpiry] = useState('');
    const [editMaxStreams, setEditMaxStreams] = useState(1);
    const [updating, setUpdating] = useState(false);

    // Bulk Actions
    const { 
        selectedUsers, toggleUserSelection, clearSelection, 
        addActivity, addNotification 
    } = useAdmin();


    // Fetch users
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, account_number, created_at, role, subscription_status, subscription_ends_at, max_concurrent_streams, email, full_name')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setUsers(data || []);
        } catch (err) {
            console.error('Error fetching users:', err);
            addNotification('error', 'Kullanıcılar yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Filtered users
    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            // Search filter
            if (filters.search) {
                const term = filters.search.replace(/\s/g, '').toLowerCase();
                const searchIn = [
                    user.account_number,
                    user.email,
                    user.full_name
                ].join(' ').toLowerCase();
                if (!searchIn.includes(term)) return false;
            }
            
            // Status filter - suspended = banned
            const isSuspended = user.subscription_status === 'suspended';
            if (filters.status === 'active' && isSuspended) return false;
            if (filters.status === 'banned' && !isSuspended) return false;
            
            // Subscription filter
            const hasActiveSub = user.subscription_status === 'active' || 
                (user.subscription_ends_at && new Date(user.subscription_ends_at) > new Date());
            const isExpired = user.subscription_status === 'expired' || 
                (user.subscription_ends_at && new Date(user.subscription_ends_at) <= new Date());
            
            if (filters.subscription === 'active' && !hasActiveSub) return false;
            if (filters.subscription === 'expired' && !isExpired) return false;
            if (filters.subscription === 'none' && user.subscription_ends_at) return false;
            
            return true;
        }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [users, filters]);

    // Stats
    const stats = useMemo(() => ({
        total: filteredUsers.length,
        selected: selectedUsers.length,
        active: filteredUsers.filter(u => u.subscription_status !== 'suspended').length,
        banned: filteredUsers.filter(u => u.subscription_status === 'suspended').length
    }), [filteredUsers, selectedUsers]);

    // Toggle ban
    const handleBanToggle = async (user: User) => {
        const isSuspended = user.subscription_status === 'suspended';
        if (!confirm(`${user.account_number} numaralı hesabı ${isSuspended ? 'aktif etmek' : 'askıya almak'} istediğinize emin misiniz?`)) return;

        try {
            const newStatus = isSuspended ? 'active' : 'suspended';
            const { error } = await supabase
                .from('profiles')
                .update({ subscription_status: newStatus })
                .eq('id', user.id);

            if (error) throw error;
            
            addActivity(
                isSuspended ? 'Hesap aktif edildi' : 'Hesap askıya alındı',
                user.account_number
            );
            addNotification('success', `${user.account_number} ${isSuspended ? 'aktif edildi' : 'askıya alındı'}`);
            fetchUsers();
        } catch (err) {
            addNotification('error', 'İşlem başarısız: ' + (err as Error).message);
        }
    };

    // Bulk ban
    const handleBulkBan = async (ban: boolean) => {
        if (!confirm(`${selectedUsers.length} kullanıcıyı ${ban ? 'askıya almak' : 'aktif etmek'} istediğinize emin misiniz?`)) return;
        
        try {
            const newStatus = ban ? 'suspended' : 'active';
            const { error } = await supabase
                .from('profiles')
                .update({ subscription_status: newStatus })
                .in('id', selectedUsers);

            if (error) throw error;
            
            addActivity(
                `Toplu ${ban ? 'askıya alma' : 'aktivasyon'}`,
                `${selectedUsers.length} kullanıcı`
            );
            addNotification('success', `${selectedUsers.length} kullanıcı ${ban ? 'askıya alındı' : 'aktif edildi'}`);
            clearSelection();
            fetchUsers();
        } catch (err) {
            addNotification('error', 'Toplu işlem başarısız');
        }
    };

    // Edit modal
    const openEditModal = (user: User) => {
        setEditingUser(user);
        setEditExpiry(user.subscription_ends_at ? new Date(user.subscription_ends_at).toISOString().split('T')[0] : '');
        setEditMaxStreams(user.max_concurrent_streams || 1);
    };

    const handleUpdateUser = async () => {
        if (!editingUser) return;
        setUpdating(true);

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    subscription_ends_at: editExpiry ? new Date(editExpiry).toISOString() : null,
                    subscription_status: editExpiry && new Date(editExpiry) > new Date() ? 'active' : 'expired',
                    max_concurrent_streams: Math.max(1, Math.min(5, editMaxStreams)),
                })
                .eq('id', editingUser.id);

            if (error) throw error;
            
            addActivity('Kullanıcı güncellendi', editingUser.account_number);
            addNotification('success', `${editingUser.account_number} güncellendi`);
            setEditingUser(null);
            fetchUsers();
        } catch (err) {
            addNotification('error', 'Güncelleme başarısız');
        } finally {
            setUpdating(false);
        }
    };



    // Export to CSV
    const exportCSV = () => {
        const headers = ['Hesap No', 'E-posta', 'Durum', 'Abonelik', 'Abonelik Bitiş', 'Ekran Limiti', 'Kayıt Tarihi'];
        const rows = filteredUsers.map(u => [
            u.account_number,
            u.email,
            u.subscription_status === 'suspended' ? 'Askıya Alınmış' : u.subscription_status,
            u.subscription_ends_at ? new Date(u.subscription_ends_at).toLocaleDateString('tr-TR') : 'Süresiz',
            u.max_concurrent_streams || 1,
            new Date(u.created_at).toLocaleDateString('tr-TR')
        ]);
        
        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        addActivity('CSV dışa aktarımı', `${filteredUsers.length} kullanıcı`);
    };

    return (
        <div className="max-w-7xl mx-auto animation-fade-in">
            {/* Header */}
            <header className="mb-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl lg:text-4xl font-black tracking-tight uppercase bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
                            Kullanıcı Yönetimi
                        </h1>
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2">
                            {stats.total} kullanıcı • {stats.active} aktif • {stats.banned} yasaklı
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={exportCSV}
                            className="flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all text-sm font-bold"
                        >
                            <Download size={16} />
                            CSV
                        </button>
                        <button
                            onClick={fetchUsers}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-3 bg-surface/50 border border-white/10 rounded-2xl hover:bg-white/5 transition-all text-sm font-bold"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            Yenile
                        </button>
                    </div>
                </div>

                {/* Search & Filters */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Hesap numarası ara..."
                            value={filters.search}
                            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                            className="w-full pl-12 pr-4 py-4 bg-surface/50 backdrop-blur-xl border border-white/10 rounded-2xl focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all font-mono tracking-wider text-sm"
                        />
                    </div>
                    
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all ${
                            showFilters ? 'bg-primary text-white' : 'bg-surface/50 border border-white/10 hover:bg-white/5'
                        }`}
                    >
                        <Filter size={18} />
                        Filtreler
                        {(filters.status !== 'all' || filters.subscription !== 'all') && (
                            <span className="ml-1 w-2 h-2 rounded-full bg-current" />
                        )}
                    </button>
                </div>

                {/* Filter Options */}
                {showFilters && (
                    <div className="mt-4 p-4 bg-surface/30 border border-white/10 rounded-2xl flex flex-wrap gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Durum</label>
                            <div className="flex gap-2">
                                {(['all', 'active', 'banned'] as const).map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => setFilters(f => ({ ...f, status }))}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                                            filters.status === status 
                                                ? 'bg-primary text-white' 
                                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                        }`}
                                    >
                                        {status === 'all' ? 'Tümü' : status === 'active' ? 'Aktif' : 'Yasaklı'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Abonelik</label>
                            <div className="flex gap-2">
                                {(['all', 'active', 'expired', 'none'] as const).map((sub) => (
                                    <button
                                        key={sub}
                                        onClick={() => setFilters(f => ({ ...f, subscription: sub }))}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                                            filters.subscription === sub 
                                                ? 'bg-primary text-white' 
                                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                        }`}
                                    >
                                        {sub === 'all' ? 'Tümü' : sub === 'active' ? 'Aktif' : sub === 'expired' ? 'Süresi Dolmuş' : 'Süresiz'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Bulk Actions Bar */}
                {selectedUsers.length > 0 && (
                    <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-3">
                            <CheckSquare size={20} className="text-primary" />
                            <span className="font-bold text-sm">{selectedUsers.length} kullanıcı seçildi</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleBulkBan(true)}
                                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-black uppercase transition-colors"
                            >
                                Yasakla
                            </button>
                            <button
                                onClick={() => handleBulkBan(false)}
                                className="px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-xl text-xs font-black uppercase transition-colors"
                            >
                                Aktif Et
                            </button>
                            <button
                                onClick={clearSelection}
                                className="p-2 hover:bg-white/5 rounded-xl transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </header>

            {/* Users Table */}
            <div className="bg-surface/40 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-black/40">
                                <th className="px-4 py-4">
                                    <button 
                                        onClick={() => {
                                            if (selectedUsers.length === filteredUsers.length) {
                                                clearSelection();
                                            } else {
                                                filteredUsers.forEach(u => {
                                                    if (!selectedUsers.includes(u.id)) toggleUserSelection(u.id);
                                                });
                                            }
                                        }}
                                        className="p-1 hover:bg-white/5 rounded transition-colors"
                                    >
                                        {selectedUsers.length === filteredUsers.length && filteredUsers.length > 0 ? (
                                            <CheckSquare size={18} className="text-primary" />
                                        ) : (
                                            <Square size={18} className="text-gray-500" />
                                        )}
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Hesap</th>
                                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-center">Durum</th>
                                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Abonelik</th>
                                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-center">Ekran</th>
                                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">E-posta</th>
                                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-8 py-24 text-center">
                                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                                    </td>
                                </tr>
                            ) : filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                    <tr 
                                        key={user.id} 
                                        className={`group transition-colors hover:bg-white/5 ${
                                            selectedUsers.includes(user.id) ? 'bg-primary/5' : ''
                                        }`}
                                    >
                                        <td className="px-4 py-4">
                                            <button 
                                                onClick={() => toggleUserSelection(user.id)}
                                                className="p-1 hover:bg-white/5 rounded transition-colors"
                                            >
                                                {selectedUsers.includes(user.id) ? (
                                                    <CheckSquare size={18} className="text-primary" />
                                                ) : (
                                                    <Square size={18} className="text-gray-600" />
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                                                    {user.account_number?.substring(0, 1)}
                                                </div>
                                                <div>
                                                    <div className="font-mono text-sm font-bold tracking-wider">
                                                        {user.account_number?.replace(/(\d{4})/g, '$1 ').trim()}
                                                    </div>
                                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                                        {new Date(user.created_at).toLocaleDateString('tr-TR')}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                                user.subscription_status === 'suspended'
                                                    ? 'bg-red-500/10 text-red-500 border-red-500/30' 
                                                    : user.subscription_status === 'active'
                                                    ? 'bg-green-500/10 text-green-500 border-green-500/30'
                                                    : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
                                            }`}>
                                                {user.subscription_status === 'suspended' ? <Ban size={10} /> : 
                                                 user.subscription_status === 'active' ? <CheckCircle size={10} /> : <Clock size={10} />}
                                                {user.subscription_status === 'suspended' ? 'Askıda' : 
                                                 user.subscription_status === 'active' ? 'Aktif' : user.subscription_status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            {user.subscription_ends_at ? (
                                                <div>
                                                    <span className={`text-sm font-bold ${
                                                        new Date(user.subscription_ends_at) > new Date() ? 'text-white' : 'text-red-500'
                                                    }`}>
                                                        {new Date(user.subscription_ends_at).toLocaleDateString('tr-TR')}
                                                    </span>
                                                    <div className="text-[9px] text-gray-500 uppercase">
                                                        {new Date(user.subscription_ends_at) > new Date() ? 'Aktif' : 'Süresi Doldu'}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-500 font-bold uppercase">Süresiz</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold">
                                                <Monitor size={12} />
                                                {user.max_concurrent_streams || 1}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="text-gray-400 text-xs">
                                                {user.email}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleBanToggle(user)}
                                                    className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${
                                                        user.subscription_status === 'suspended'
                                                            ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' 
                                                            : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                                                    }`}
                                                    title={user.subscription_status === 'suspended' ? 'Aktif Et' : 'Askıya Al'}
                                                >
                                                    {user.subscription_status === 'suspended' ? <Shield size={16} /> : <Ban size={16} />}
                                                </button>
                                                <button
                                                    onClick={() => openEditModal(user)}
                                                    className="px-4 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl transition-all font-black uppercase tracking-wider text-[10px]"
                                                >
                                                    Yönet
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-8 py-24 text-center">
                                        <div className="flex flex-col items-center justify-center opacity-40">
                                            <UsersIcon size={48} className="mb-4 text-gray-400" />
                                            <span className="text-gray-400 font-bold uppercase tracking-widest text-sm">
                                                Filtreye uygun kullanıcı bulunamadı.
                                            </span>
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
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEditingUser(null)} />
                    
                    <div className="bg-surface border border-white/10 w-full max-w-lg rounded-3xl shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-blue-500 to-primary" />
                        
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight">Hesap Yönetimi</h3>
                                <div className="text-primary font-mono text-sm font-bold tracking-widest mt-1">
                                    {editingUser.account_number}
                                </div>
                            </div>
                            <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Subscription -->
                            <div>
                                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-gray-400 mb-3">
                                    <Calendar size={14} className="text-primary" />
                                    Abonelik Bitiş Tarihi
                                </label>
                                <input
                                    type="date"
                                    value={editExpiry}
                                    onChange={(e) => setEditExpiry(e.target.value)}
                                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-sm [color-scheme:dark]"
                                />
                                <div className="grid grid-cols-4 gap-2 mt-3">
                                    {[1, 3, 6, 12].map((m) => (
                                        <button
                                            key={m}
                                            onClick={() => addMonths(m)}
                                            className="py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold uppercase rounded-lg transition-colors"
                                        >
                                            +{m} {m === 12 ? 'YIL' : 'AY'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Concurrent Streams */}
                            <div>
                                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-gray-400 mb-3">
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
                                        className="flex-1 h-2 bg-white/10 rounded-lg accent-primary"
                                    />
                                    <span className="w-10 text-center text-2xl font-black text-primary">
                                        {editMaxStreams}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-black/40 border-t border-white/5 flex gap-3">
                            <button
                                onClick={() => setEditingUser(null)}
                                className="flex-1 py-3 font-black uppercase tracking-widest text-xs bg-transparent hover:bg-white/5 border border-white/10 rounded-xl transition-colors"
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={handleUpdateUser}
                                disabled={updating}
                                className="flex-[2] py-3 bg-primary hover:bg-primary-hover text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {updating ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Save size={16} />
                                        Kaydet
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
