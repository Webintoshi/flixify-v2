import { useState, useEffect, useMemo } from 'react';
import { 
    Search, Shield, Ban, CheckCircle, Save, X, Clock,
    Users as UsersIcon, Monitor, Filter, Tv,
    Download, CheckSquare, Square, AlertCircle,
    RefreshCw, ChevronDown, User, Calendar,
    Edit3, Mail, Activity, Infinity
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
    iptv_username: string | null;
    iptv_password: string | null;
    iptv_status: string | null;
    iptv_expiry_date: string | null;
}

interface Filters {
    status: 'all' | 'active' | 'banned';
    subscription: 'all' | 'active' | 'expired' | 'none';
    search: string;
}

// Helper: Get initials from account number
const getInitials = (accountNumber: string) => {
    return accountNumber?.substring(0, 2).toUpperCase() || '??';
};

// Helper: Format account number with spaces
const formatAccountNumber = (accountNumber: string) => {
    return accountNumber?.replace(/(\d{4})(?=\d)/g, '$1 ').trim() || '';
};

// Helper: Get subscription status details
const getSubscriptionStatus = (user: User): { label: string; color: string; icon: React.ElementType } => {
    if (user.subscription_status === 'suspended') {
        return { label: 'Askıda', color: 'red', icon: Ban };
    }
    if (!user.subscription_ends_at) {
        return { label: 'Süresiz', color: 'gray', icon: Infinity as React.ElementType };
    }
    const isExpired = new Date(user.subscription_ends_at) <= new Date();
    if (isExpired) {
        return { label: 'Süresi Doldu', color: 'orange', icon: Clock };
    }
    return { label: 'Aktif', color: 'green', icon: CheckCircle };
};

// Helper: Get days until expiry
const getDaysUntilExpiry = (dateStr: string | null) => {
    if (!dateStr) return null;
    const expiry = new Date(dateStr);
    const now = new Date();
    const diff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
};

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
    const [editIptvUsername, setEditIptvUsername] = useState('');
    const [editIptvPassword, setEditIptvPassword] = useState('');
    const [editIptvExpiry, setEditIptvExpiry] = useState('');
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
                .select('id, account_number, created_at, role, subscription_status, subscription_ends_at, max_concurrent_streams, email, full_name, iptv_username, iptv_password, iptv_status, iptv_expiry_date')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setUsers((data || []) as User[]);
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
    const stats = useMemo(() => {
        const total = users.length;
        const active = users.filter(u => u.subscription_status !== 'suspended').length;
        const banned = users.filter(u => u.subscription_status === 'suspended').length;
        const expired = users.filter(u => {
            return u.subscription_ends_at && new Date(u.subscription_ends_at) <= new Date();
        }).length;
        const expiringSoon = users.filter(u => {
            if (!u.subscription_ends_at) return false;
            const days = getDaysUntilExpiry(u.subscription_ends_at);
            return days !== null && days > 0 && days <= 7;
        }).length;
        
        return { total, active, banned, expired, expiringSoon, selected: selectedUsers.length };
    }, [users, selectedUsers]);

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
        setEditIptvUsername(user.iptv_username || '');
        setEditIptvPassword(user.iptv_password || '');
        setEditIptvExpiry(user.iptv_expiry_date ? new Date(user.iptv_expiry_date).toISOString().split('T')[0] : '');
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
                    iptv_username: editIptvUsername || null,
                    iptv_password: editIptvPassword || null,
                    iptv_expiry_date: editIptvExpiry ? new Date(editIptvExpiry).toISOString() : null,
                    iptv_status: editIptvUsername ? 'active' : 'inactive',
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

    // Stat Card Component
    const StatCard = ({ label, value, subtext, color, icon: Icon }: any) => (
        <div className="group relative bg-surface/40 backdrop-blur-xl border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-all duration-300">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1">{label}</p>
                    <p className="text-2xl font-black text-white">{value}</p>
                    {subtext && <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 text-${color}-400`}>{subtext}</p>}
                </div>
                <div className={`p-2.5 rounded-xl bg-${color}-500/10 text-${color}-500`}>
                    <Icon size={18} />
                </div>
            </div>
        </div>
    );

    // Quick Filter Chip
    const FilterChip = ({ active, label, count, onClick }: any) => (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                active 
                    ? 'bg-primary text-white shadow-lg shadow-primary/25' 
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
            }`}
        >
            {label}
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${active ? 'bg-white/20' : 'bg-white/10'}`}>
                {count}
            </span>
        </button>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header Section */}
            <header className="space-y-6">
                {/* Title Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                            Kullanıcı Yönetimi
                        </h1>
                        <p className="text-gray-400 text-sm mt-1">
                            Tüm kullanıcı hesaplarını yönetin ve abonelikleri düzenleyin
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={exportCSV}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-xs font-bold uppercase tracking-wider"
                        >
                            <Download size={14} />
                            CSV
                        </button>
                        <button
                            onClick={fetchUsers}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2.5 bg-surface/50 border border-white/10 rounded-xl hover:bg-white/5 transition-all text-xs font-bold uppercase tracking-wider"
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            Yenile
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <StatCard label="Toplam" value={stats.total} icon={UsersIcon} color="primary" />
                    <StatCard label="Aktif" value={stats.active} subtext="Çalışıyor" icon={CheckCircle} color="green" />
                    <StatCard label="Askıda" value={stats.banned} subtext="Yasaklı" icon={Ban} color="red" />
                    <StatCard label="Süresi Dolmuş" value={stats.expired} subtext="Yenileme gerekli" icon={Clock} color="orange" />
                    <StatCard label="Bitmek Üzere" value={stats.expiringSoon} subtext="7 gün içinde" icon={AlertCircle} color="yellow" />
                </div>

                {/* Toolbar */}
                <div className="bg-surface/40 backdrop-blur-xl border border-white/5 rounded-2xl p-4 space-y-4">
                    {/* Search and Main Actions */}
                    <div className="flex flex-col lg:flex-row gap-3">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Hesap numarası, e-posta veya isim ara..."
                                value={filters.search}
                                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                                className="w-full pl-11 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all text-sm"
                            />
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                                    showFilters ? 'bg-primary text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                                }`}
                            >
                                <Filter size={14} />
                                Filtreler
                                <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {/* Expandable Filters */}
                    {showFilters && (
                        <div className="pt-4 border-t border-white/5 animate-in slide-in-from-top-2">
                            <div className="flex flex-wrap gap-2">
                                <FilterChip 
                                    active={filters.status === 'all' && filters.subscription === 'all'}
                                    label="Tümü"
                                    count={users.length}
                                    onClick={() => setFilters({ status: 'all', subscription: 'all', search: filters.search })}
                                />
                                <FilterChip 
                                    active={filters.status === 'active'}
                                    label="Aktif Hesaplar"
                                    count={users.filter(u => u.subscription_status !== 'suspended').length}
                                    onClick={() => setFilters(f => ({ ...f, status: f.status === 'active' ? 'all' : 'active' }))}
                                />
                                <FilterChip 
                                    active={filters.status === 'banned'}
                                    label="Askıya Alınmış"
                                    count={users.filter(u => u.subscription_status === 'suspended').length}
                                    onClick={() => setFilters(f => ({ ...f, status: f.status === 'banned' ? 'all' : 'banned' }))}
                                />
                                <FilterChip 
                                    active={filters.subscription === 'expired'}
                                    label="Süresi Dolmuş"
                                    count={users.filter(u => u.subscription_ends_at && new Date(u.subscription_ends_at) <= new Date()).length}
                                    onClick={() => setFilters(f => ({ ...f, subscription: f.subscription === 'expired' ? 'all' : 'expired' }))}
                                />
                                <FilterChip 
                                    active={filters.subscription === 'active'}
                                    label="Aktif Abonelik"
                                    count={users.filter(u => u.subscription_ends_at && new Date(u.subscription_ends_at) > new Date()).length}
                                    onClick={() => setFilters(f => ({ ...f, subscription: f.subscription === 'active' ? 'all' : 'active' }))}
                                />
                                <FilterChip 
                                    active={filters.subscription === 'none'}
                                    label="Süresiz"
                                    count={users.filter(u => !u.subscription_ends_at).length}
                                    onClick={() => setFilters(f => ({ ...f, subscription: f.subscription === 'none' ? 'all' : 'none' }))}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Bulk Actions Bar */}
                {selectedUsers.length > 0 && (
                    <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-2">
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

            {/* Users Content */}
            <div className="bg-surface/30 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-xl">
                {/* Table Header */}
                <div className="hidden lg:grid grid-cols-[48px_1.5fr_140px_140px_100px_1.5fr_140px] gap-4 px-6 py-4 border-b border-white/5 bg-black/40">
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
                        className="flex items-center justify-center p-1 hover:bg-white/5 rounded transition-colors"
                    >
                        {selectedUsers.length === filteredUsers.length && filteredUsers.length > 0 ? (
                            <CheckSquare size={18} className="text-primary" />
                        ) : (
                            <Square size={18} className="text-gray-500" />
                        )}
                    </button>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Hesap Bilgisi</span>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-center">Durum</span>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-center">Abonelik</span>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-center">Ekran</span>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">İletişim</span>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-right">İşlemler</span>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="p-12 text-center">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    </div>
                )}

                {/* Empty State */}
                {!loading && filteredUsers.length === 0 && (
                    <div className="p-12 text-center">
                        <div className="flex flex-col items-center justify-center opacity-40">
                            <UsersIcon size={48} className="mb-4 text-gray-400" />
                            <span className="text-gray-400 font-bold uppercase tracking-widest text-sm">
                                Filtreye uygun kullanıcı bulunamadı.
                            </span>
                        </div>
                    </div>
                )}

                {/* Users List */}
                {!loading && filteredUsers.map((user) => {
                    const subStatus = getSubscriptionStatus(user);
                    const daysLeft = user.subscription_ends_at ? getDaysUntilExpiry(user.subscription_ends_at) : null;
                    const StatusIcon = subStatus.icon;
                    const isSelected = selectedUsers.includes(user.id);
                    const isSuspended = user.subscription_status === 'suspended';

                    return (
                        <div 
                            key={user.id}
                            className={`group relative border-b border-white/5 last:border-0 transition-all duration-200 ${
                                isSelected ? 'bg-primary/5' : 'hover:bg-white/[0.02]'
                            }`}
                        >
                            {/* Desktop View */}
                            <div className="hidden lg:grid grid-cols-[48px_1.5fr_140px_140px_100px_1.5fr_140px] gap-4 px-6 py-4 items-center">
                                {/* Checkbox */}
                                <button 
                                    onClick={() => toggleUserSelection(user.id)}
                                    className="flex items-center justify-center p-1 hover:bg-white/5 rounded transition-colors"
                                >
                                    {isSelected ? (
                                        <CheckSquare size={18} className="text-primary" />
                                    ) : (
                                        <Square size={18} className="text-gray-600" />
                                    )}
                                </button>

                                {/* Account Info */}
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-colors ${
                                        isSuspended 
                                            ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                                            : 'bg-gradient-to-br from-primary/30 to-primary/10 text-primary border border-primary/20'
                                    }`}>
                                        {getInitials(user.account_number)}
                                    </div>
                                    <div>
                                        <div className="font-mono text-sm font-bold tracking-wider text-white">
                                            {formatAccountNumber(user.account_number)}
                                        </div>
                                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                            {new Date(user.created_at).toLocaleDateString('tr-TR')}
                                        </div>
                                    </div>
                                </div>

                                {/* Status */}
                                <div className="flex justify-center">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                        user.subscription_status === 'suspended'
                                            ? 'bg-red-500/10 text-red-400 border-red-500/30' 
                                            : user.subscription_status === 'active'
                                            ? 'bg-green-500/10 text-green-400 border-green-500/30'
                                            : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                                    }`}>
                                        <StatusIcon size={10} />
                                        {user.subscription_status === 'suspended' ? 'Askıda' : 
                                         user.subscription_status === 'active' ? 'Aktif' : user.subscription_status}
                                    </span>
                                </div>

                                {/* Subscription */}
                                <div className="text-center">
                                    {user.subscription_ends_at ? (
                                        <div>
                                            <span className={`text-sm font-bold ${
                                                daysLeft !== null && daysLeft <= 0 ? 'text-red-400' : 
                                                daysLeft !== null && daysLeft <= 7 ? 'text-yellow-400' : 'text-white'
                                            }`}>
                                                {new Date(user.subscription_ends_at).toLocaleDateString('tr-TR')}
                                            </span>
                                            {daysLeft !== null && daysLeft > 0 && (
                                                <div className={`text-[9px] uppercase font-bold tracking-wider ${
                                                    daysLeft <= 7 ? 'text-yellow-500' : 'text-gray-500'
                                                }`}>
                                                    {daysLeft} gün kaldı
                                                </div>
                                            )}
                                            {daysLeft !== null && daysLeft <= 0 && (
                                                <div className="text-[9px] text-red-500 uppercase font-bold tracking-wider">
                                                    Süresi doldu
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-500 font-bold uppercase">Süresiz</span>
                                    )}
                                </div>

                                {/* Screens */}
                                <div className="flex justify-center">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold">
                                        <Monitor size={12} />
                                        {user.max_concurrent_streams || 1}
                                    </span>
                                </div>

                                {/* Contact */}
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 text-gray-300 text-xs truncate">
                                        <Mail size={12} className="text-gray-500 flex-shrink-0" />
                                        <span className="truncate">{user.email}</span>
                                    </div>
                                    {user.full_name && (
                                        <div className="flex items-center gap-2 text-gray-500 text-[10px] mt-0.5">
                                            <User size={10} className="flex-shrink-0" />
                                            <span className="truncate">{user.full_name}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        onClick={() => handleBanToggle(user)}
                                        className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${
                                            isSuspended
                                                ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' 
                                                : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                        }`}
                                        title={isSuspended ? 'Aktif Et' : 'Askıya Al'}
                                    >
                                        {isSuspended ? <Shield size={16} /> : <Ban size={16} />}
                                    </button>
                                    <button
                                        onClick={() => openEditModal(user)}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-primary text-gray-300 hover:text-white rounded-xl transition-all font-bold text-[10px] uppercase tracking-wider border border-white/10 hover:border-primary"
                                    >
                                        <Edit3 size={12} />
                                        Düzenle
                                    </button>
                                </div>
                            </div>

                            {/* Mobile/Tablet View */}
                            <div className="lg:hidden p-4">
                                <div className="flex items-start gap-3">
                                    {/* Checkbox */}
                                    <button 
                                        onClick={() => toggleUserSelection(user.id)}
                                        className="mt-1 p-1 hover:bg-white/5 rounded transition-colors flex-shrink-0"
                                    >
                                        {isSelected ? (
                                            <CheckSquare size={18} className="text-primary" />
                                        ) : (
                                            <Square size={18} className="text-gray-600" />
                                        )}
                                    </button>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                                                    isSuspended 
                                                        ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                                                        : 'bg-gradient-to-br from-primary/30 to-primary/10 text-primary border border-primary/20'
                                                }`}>
                                                    {getInitials(user.account_number)}
                                                </div>
                                                <div>
                                                    <div className="font-mono text-sm font-bold tracking-wider text-white">
                                                        {formatAccountNumber(user.account_number)}
                                                    </div>
                                                    <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">
                                                        {new Date(user.created_at).toLocaleDateString('tr-TR')}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                                user.subscription_status === 'suspended'
                                                    ? 'bg-red-500/10 text-red-400 border-red-500/30' 
                                                    : user.subscription_status === 'active'
                                                    ? 'bg-green-500/10 text-green-400 border-green-500/30'
                                                    : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                                            }`}>
                                                <StatusIcon size={8} />
                                                {user.subscription_status === 'suspended' ? 'Askıda' : 
                                                 user.subscription_status === 'active' ? 'Aktif' : 'Süresiz'}
                                            </span>
                                        </div>

                                        {/* Mobile Info Grid */}
                                        <div className="grid grid-cols-2 gap-2 mb-3">
                                            <div className="bg-black/30 rounded-lg p-2">
                                                <div className="text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Abonelik</div>
                                                <div className={`text-xs font-bold ${
                                                    daysLeft !== null && daysLeft <= 0 ? 'text-red-400' : 'text-white'
                                                }`}>
                                                    {user.subscription_ends_at 
                                                        ? new Date(user.subscription_ends_at).toLocaleDateString('tr-TR')
                                                        : 'Süresiz'
                                                    }
                                                </div>
                                                {daysLeft !== null && daysLeft > 0 && (
                                                    <div className="text-[9px] text-gray-500">{daysLeft} gün kaldı</div>
                                                )}
                                            </div>
                                            <div className="bg-black/30 rounded-lg p-2">
                                                <div className="text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Ekran</div>
                                                <div className="text-xs font-bold text-white flex items-center gap-1">
                                                    <Monitor size={10} className="text-blue-400" />
                                                    {user.max_concurrent_streams || 1}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 text-gray-400 text-xs mb-3 truncate">
                                            <Mail size={12} />
                                            <span className="truncate">{user.email}</span>
                                        </div>

                                        {/* Mobile Actions */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleBanToggle(user)}
                                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold uppercase transition-all ${
                                                    isSuspended
                                                        ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' 
                                                        : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                                }`}
                                            >
                                                {isSuspended ? <Shield size={14} /> : <Ban size={14} />}
                                                {isSuspended ? 'Aktif Et' : 'Askıya Al'}
                                            </button>
                                            <button
                                                onClick={() => openEditModal(user)}
                                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl transition-all text-xs font-bold uppercase"
                                            >
                                                <Edit3 size={14} />
                                                Düzenle
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Results Count */}
            {!loading && filteredUsers.length > 0 && (
                <div className="text-center text-gray-500 text-xs font-bold uppercase tracking-wider py-4">
                    {filteredUsers.length} kullanıcı gösteriliyor
                </div>
            )}

            {/* Edit Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEditingUser(null)} />
                    
                    <div className="bg-surface border border-white/10 w-full max-w-lg rounded-3xl shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-blue-500 to-primary" />
                        
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5 sticky top-0 z-10">
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
                            {/* User Info Summary */}
                            <div className="bg-white/5 rounded-2xl p-4 space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                    <Mail size={14} className="text-gray-500" />
                                    <span className="text-gray-300">{editingUser.email}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Calendar size={14} className="text-gray-500" />
                                    <span className="text-gray-300">Kayıt: {new Date(editingUser.created_at).toLocaleDateString('tr-TR')}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Activity size={14} className="text-gray-500" />
                                    <span className={`font-bold ${
                                        editingUser.subscription_status === 'suspended' ? 'text-red-400' : 'text-green-400'
                                    }`}>
                                        {editingUser.subscription_status === 'suspended' ? 'Askıya Alınmış' : 'Aktif'}
                                    </span>
                                </div>
                            </div>

                            {/* Subscription */}
                            <div>
                                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-gray-400 mb-3">
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
                                            onClick={() => {
                                                const date = new Date();
                                                date.setMonth(date.getMonth() + m);
                                                setEditExpiry(date.toISOString().split('T')[0]);
                                            }}
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

                            {/* IPTV Credentials */}
                            <div className="border-t border-white/10 pt-6">
                                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-primary mb-4">
                                    <Tv size={14} />
                                    IPTV Bilgileri
                                </label>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">Kullanıcı Adı</label>
                                        <input
                                            type="text"
                                            value={editIptvUsername}
                                            onChange={(e) => setEditIptvUsername(e.target.value)}
                                            placeholder="IPTV Kullanıcı Adı"
                                            className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-sm"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">Şifre</label>
                                        <input
                                            type="text"
                                            value={editIptvPassword}
                                            onChange={(e) => setEditIptvPassword(e.target.value)}
                                            placeholder="IPTV Şifre"
                                            className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-sm"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">IPTV Bitiş Tarihi</label>
                                        <input
                                            type="date"
                                            value={editIptvExpiry}
                                            onChange={(e) => setEditIptvExpiry(e.target.value)}
                                            className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-sm [color-scheme:dark]"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-black/40 border-t border-white/5 flex gap-3 sticky bottom-0">
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
