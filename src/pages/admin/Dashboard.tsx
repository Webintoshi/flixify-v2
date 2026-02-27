import { useEffect, useState } from 'react';
import { 
    Users, Zap, TrendingUp, AlertCircle, Clock, 
    Activity, DollarSign, Ban, UserPlus, RefreshCw, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../../contexts/AdminContext';
import { supabase } from '../../lib/supabase';

// Stats Card Component
const StatCard = ({ 
    label, value, subtext, icon: Icon, color, bg, border, trend 
}: { 
    label: string; 
    value: string | number; 
    subtext?: string;
    icon: any; 
    color: string; 
    bg: string; 
    border: string;
    trend?: { value: number; isPositive: boolean };
}) => (
    <div className="bg-surface/50 border border-white/10 rounded-3xl p-6 backdrop-blur-xl group hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 relative overflow-hidden">
        <div className={`absolute top-0 right-0 w-40 h-40 ${bg} rounded-full blur-3xl -mr-16 -mt-16 opacity-30 group-hover:opacity-50 transition-opacity`} />
        
        <div className="flex justify-between items-start mb-4 relative z-10">
            <div className={`p-3 rounded-2xl ${bg} ${border} border`}>
                <Icon size={24} className={`${color}`} />
            </div>
            {trend && (
                <div className={`flex items-center gap-1 text-xs font-bold ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                    {trend.isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {Math.abs(trend.value)}%
                </div>
            )}
        </div>
        
        <div className="relative z-10">
            <div className="text-3xl font-black mb-1 tracking-tight">{value}</div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">{label}</div>
            {subtext && <div className="text-[10px] text-gray-500">{subtext}</div>}
        </div>
    </div>
);

// System Health Indicator
const HealthIndicator = ({ status }: { status: 'healthy' | 'warning' | 'critical' }) => {
    const colors = {
        healthy: { bg: 'bg-green-500', text: 'text-green-500', label: 'Sistem Sağlıklı' },
        warning: { bg: 'bg-yellow-500', text: 'text-yellow-500', label: 'Dikkat Gerekli' },
        critical: { bg: 'bg-red-500', text: 'text-red-500', label: 'Kritik Durum' }
    };
    const theme = colors[status];

    return (
        <div className="flex items-center gap-3 bg-black/40 rounded-2xl p-4 border border-white/5">
            <div className={`w-3 h-3 rounded-full ${theme.bg} animate-pulse shadow-[0_0_10px_currentColor]`} />
            <div>
                <div className={`text-sm font-black ${theme.text}`}>{theme.label}</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Tüm sistemler çalışıyor</div>
            </div>
        </div>
    );
};

// Activity Item Component
const ActivityItem = ({ action, target, time }: { action: string; target: string; time: string }) => (
    <div className="flex items-center gap-4 p-4 bg-black/40 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Activity size={18} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white truncate">{action}</div>
            <div className="text-xs text-gray-500">{target}</div>
        </div>
        <div className="text-[10px] text-gray-500 font-mono shrink-0">
            {new Date(time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
        </div>
    </div>
);

export default function Dashboard() {
    const { 
        stats, refreshStats, statsLoading, activityLog, addActivity,
        notifications, unreadCount 
    } = useAdmin();
    const [recentUsers, setRecentUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    // Fetch real stats and recent users
    const [realStats, setRealStats] = useState({
        totalUsers: 0,
        activeSubscriptions: 0,
        expiredSubscriptions: 0,
        bannedUsers: 0,
        newUsersToday: 0,
        revenue: 0,
        systemHealth: 'healthy' as const
    });

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoadingUsers(true);
            try {
                // Total users
                const { count: totalUsers } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true });

                // Active subscriptions
                const { count: activeSubs } = await supabase
                    .from('subscriptions')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'active');

                // Expired subscriptions
                const { count: expiredSubs } = await supabase
                    .from('subscriptions')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'expired');

                // Suspended/banned users
                const { count: suspendedUsers } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .eq('subscription_status', 'suspended');

                // New users today
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const { count: newToday } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', today.toISOString());

                // Total revenue
                const { data: payments } = await supabase
                    .from('payments')
                    .select('amount')
                    .eq('status', 'completed');
                
                const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

                setRealStats({
                    totalUsers: totalUsers || 0,
                    activeSubscriptions: activeSubs || 0,
                    expiredSubscriptions: expiredSubs || 0,
                    bannedUsers: suspendedUsers || 0,
                    newUsersToday: newToday || 0,
                    revenue: totalRevenue,
                    systemHealth: 'healthy'
                });

                // Recent users
                const { data: recentData, error: recentError } = await supabase
                    .from('profiles')
                    .select('id, account_number, created_at, subscription_status')
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (recentError) throw recentError;
                
                setRecentUsers(recentData?.map(user => ({
                    ...user,
                    is_banned: user.subscription_status === 'suspended'
                })) || []);

            } catch (err) {
                console.error('Error fetching dashboard data:', err);
            } finally {
                setLoadingUsers(false);
            }
        };

        fetchDashboardData();
    }, []);

    // Use real stats instead of context stats
    const displayStats = realStats.totalUsers > 0 ? realStats : stats;

    // Track mount
    useEffect(() => {
        addActivity('Dashboard görüntülendi', 'Admin Paneli');
    }, [addActivity]);

    const statCards = [
        { 
            label: 'Toplam Kullanıcı', 
            value: displayStats.totalUsers.toLocaleString('tr-TR'), 
            subtext: `${displayStats.newUsersToday} yeni bugün`,
            icon: Users, 
            color: 'text-blue-500', 
            bg: 'bg-blue-500', 
            border: 'border-blue-500/20',
            trend: { value: 12, isPositive: true }
        },
        { 
            label: 'Aktif Abonelik', 
            value: displayStats.activeSubscriptions.toLocaleString('tr-TR'), 
            subtext: `${displayStats.expiredSubscriptions} süresi dolmuş`,
            icon: Zap, 
            color: 'text-primary', 
            bg: 'bg-primary', 
            border: 'border-primary/20',
            trend: { value: 8, isPositive: true }
        },
        { 
            label: 'Askıya Alınan', 
            value: displayStats.bannedUsers.toLocaleString('tr-TR'), 
            subtext: displayStats.totalUsers > 0 ? `${((displayStats.bannedUsers / displayStats.totalUsers) * 100).toFixed(1)}% oranında` : '0%',
            icon: Ban, 
            color: 'text-red-500', 
            bg: 'bg-red-500', 
            border: 'border-red-500/20' 
        },
        { 
            label: 'Toplam Gelir', 
            value: `₺${displayStats.revenue.toLocaleString('tr-TR')}`, 
            subtext: 'Tamamlanan ödemeler',
            icon: DollarSign, 
            color: 'text-green-500', 
            bg: 'bg-green-500', 
            border: 'border-green-500/20',
            trend: { value: 23, isPositive: true }
        },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-8 animation-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-black tracking-tight uppercase bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
                        Kontrol Merkezi
                    </h1>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2">
                        Flixify Admin Paneli • {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => refreshStats()}
                        disabled={statsLoading}
                        className="flex items-center gap-2 px-4 py-3 bg-surface/50 border border-white/10 rounded-2xl hover:bg-white/5 transition-all text-sm font-bold disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={statsLoading ? 'animate-spin' : ''} />
                        Yenile
                    </button>
                    
                    {unreadCount > 0 && (
                        <div className="px-4 py-3 bg-primary/10 border border-primary/20 rounded-2xl text-primary text-sm font-bold">
                            {unreadCount} Bildirim
                        </div>
                    )}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card, i) => (
                    <StatCard key={i} {...card} />
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Users - 2 cols */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-surface/40 border border-white/5 rounded-3xl p-6 backdrop-blur-xl">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                                    <UserPlus size={20} className="text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black uppercase tracking-tight">Son Kayıtlar</h2>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Son 5 kullanıcı</p>
                                </div>
                            </div>
                            <Link 
                                to="/admin/users" 
                                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-xs font-black uppercase tracking-wider"
                            >
                                Tümünü Gör
                                <ArrowUpRight size={14} />
                            </Link>
                        </div>

                        <div className="space-y-2">
                            {loadingUsers ? (
                                <div className="py-12 flex justify-center">
                                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : recentUsers.length > 0 ? (
                                recentUsers.map((user) => (
                                    <div 
                                        key={user.id} 
                                        className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5 hover:border-white/10 transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                                                {user.account_number?.substring(0, 1)}
                                            </div>
                                            <div>
                                                <div className="font-mono text-sm font-bold tracking-wider group-hover:text-primary transition-colors">
                                                    {user.account_number?.replace(/(\d{4})/g, '$1 ').trim()}
                                                </div>
                                                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                                    {new Date(user.created_at).toLocaleDateString('tr-TR')}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                            user.is_banned 
                                                ? 'bg-red-500/10 text-red-500 border-red-500/30' 
                                                : 'bg-green-500/10 text-green-500 border-green-500/30'
                                        }`}>
                                            {user.is_banned ? 'Yasaklı' : 'Aktif'}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 text-gray-500 font-bold uppercase tracking-widest text-xs border-2 border-dashed border-white/5 rounded-2xl">
                                    Henüz kayıtlı kullanıcı yok.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Link 
                            to="/admin/users" 
                            className="flex items-center gap-4 p-5 bg-primary/10 border border-primary/20 rounded-2xl hover:bg-primary/20 transition-all group"
                        >
                            <div className="p-3 bg-primary rounded-xl text-white shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                                <Users size={24} />
                            </div>
                            <div>
                                <div className="text-sm font-black text-white">Kullanıcıları Yönet</div>
                                <div className="text-[10px] text-gray-400 font-bold uppercase mt-1">Süre ekle, M3U ata, banla</div>
                            </div>
                        </Link>

                        <Link 
                            to="/admin/plans" 
                            className="flex items-center gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group"
                        >
                            <div className="p-3 bg-surface rounded-xl text-gray-300 group-hover:scale-110 transition-transform border border-white/5">
                                <Zap size={24} />
                            </div>
                            <div>
                                <div className="text-sm font-black text-white">Paketleri Düzenle</div>
                                <div className="text-[10px] text-gray-400 font-bold uppercase mt-1">Fiyatlandırma ve süreler</div>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Sidebar - 1 col */}
                <div className="space-y-6">
                    {/* System Health */}
                    <HealthIndicator status={displayStats.systemHealth} />

                    {/* Activity Log */}
                    <div className="bg-surface/40 border border-white/5 rounded-3xl p-6 backdrop-blur-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <Clock size={18} className="text-primary" />
                            <h2 className="text-sm font-black uppercase tracking-wider">Son Aktiviteler</h2>
                        </div>
                        
                        <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {activityLog.length > 0 ? (
                                activityLog.slice(0, 5).map((activity) => (
                                    <ActivityItem 
                                        key={activity.id}
                                        action={activity.action}
                                        target={activity.target}
                                        time={activity.timestamp}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-500 text-xs">
                                    Henüz aktivite kaydı yok.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Notifications */}
                    {notifications.filter(n => !n.read).length > 0 && (
                        <div className="bg-surface/40 border border-white/5 rounded-3xl p-6 backdrop-blur-xl">
                            <div className="flex items-center gap-3 mb-4">
                                <AlertCircle size={18} className="text-primary" />
                                <h2 className="text-sm font-black uppercase tracking-wider">Bildirimler</h2>
                            </div>
                            <div className="space-y-2">
                                {notifications.filter(n => !n.read).slice(0, 3).map((notif) => (
                                    <div 
                                        key={notif.id}
                                        className={`p-3 rounded-xl text-xs font-bold border ${
                                            notif.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                            notif.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                                            notif.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                                            'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                        }`}
                                    >
                                        {notif.message}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Info Card */}
                    <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-3xl p-6">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-primary/20 rounded-lg">
                                <TrendingUp size={18} className="text-primary" />
                            </div>
                            <div>
                                <h3 className="font-black text-white mb-1 text-sm">Sistem Durumu</h3>
                                <p className="text-[10px] text-gray-400 leading-relaxed">
                                    Tüm sistemler normal çalışıyor. Son yedekleme: {new Date().toLocaleTimeString('tr-TR')}.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
