import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Types
export interface AdminStats {
    totalUsers: number;
    activeUsers: number;
    bannedUsers: number;
    newUsersToday: number;
    activeSubscriptions: number;
    expiredSubscriptions: number;
    revenue: number;
    systemHealth: 'healthy' | 'warning' | 'critical';
}

export interface ActivityLog {
    id: string;
    action: string;
    target: string;
    performedBy: string;
    timestamp: string;
    details?: string;
}

export interface Notification {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    timestamp: string;
    read: boolean;
}

interface AdminContextType {
    // Stats
    stats: AdminStats;
    refreshStats: () => Promise<void>;
    statsLoading: boolean;
    
    // Activity Log
    activityLog: ActivityLog[];
    addActivity: (action: string, target: string, details?: string) => void;
    
    // Notifications
    notifications: Notification[];
    addNotification: (type: Notification['type'], message: string) => void;
    markNotificationAsRead: (id: string) => void;
    clearNotifications: () => void;
    unreadCount: number;
    
    // Bulk Operations
    selectedUsers: string[];
    setSelectedUsers: (ids: string[]) => void;
    toggleUserSelection: (id: string) => void;
    clearSelection: () => void;
    
    // Global Loading
    globalLoading: boolean;
    setGlobalLoading: (loading: boolean) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [stats, setStats] = useState<AdminStats>({
        totalUsers: 0,
        activeUsers: 0,
        bannedUsers: 0,
        newUsersToday: 0,
        activeSubscriptions: 0,
        expiredSubscriptions: 0,
        revenue: 0,
        systemHealth: 'healthy'
    });
    const [statsLoading, setStatsLoading] = useState(false);
    const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [globalLoading, setGlobalLoading] = useState(false);

    const unreadCount = notifications.filter(n => !n.read).length;

    // Fetch comprehensive stats
    const refreshStats = useCallback(async () => {
        setStatsLoading(true);
        try {
            const { data: profiles, error } = await supabase.rpc('get_all_profiles');
            if (error) throw error;

            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            const totalUsers = profiles?.length || 0;
            const bannedUsers = profiles?.filter((p: any) => p.is_banned).length || 0;
            const activeUsers = totalUsers - bannedUsers;
            
            const newUsersToday = profiles?.filter((p: any) => {
                const created = new Date(p.created_at);
                return created >= today;
            }).length || 0;

            const activeSubscriptions = profiles?.filter((p: any) => 
                p.subscription_expiry && new Date(p.subscription_expiry) > now
            ).length || 0;

            const expiredSubscriptions = profiles?.filter((p: any) => 
                p.subscription_expiry && new Date(p.subscription_expiry) <= now
            ).length || 0;

            // Calculate estimated revenue from active subscriptions
            const revenue = activeSubscriptions * 50; // Estimated avg

            // System health check
            let systemHealth: AdminStats['systemHealth'] = 'healthy';
            if (bannedUsers > totalUsers * 0.1) systemHealth = 'warning';
            if (expiredSubscriptions > activeSubscriptions * 2) systemHealth = 'critical';

            setStats({
                totalUsers,
                activeUsers,
                bannedUsers,
                newUsersToday,
                activeSubscriptions,
                expiredSubscriptions,
                revenue,
                systemHealth
            });
        } catch (err) {
            console.error('Failed to fetch stats:', err);
            addNotification('error', 'İstatistikler yüklenirken hata oluştu');
        } finally {
            setStatsLoading(false);
        }
    }, []);

    // Activity log
    const addActivity = useCallback((action: string, target: string, details?: string) => {
        const newActivity: ActivityLog = {
            id: Math.random().toString(36).substr(2, 9),
            action,
            target,
            performedBy: 'Admin',
            timestamp: new Date().toISOString(),
            details
        };
        setActivityLog(prev => [newActivity, ...prev].slice(0, 50));
    }, []);

    // Notifications
    const addNotification = useCallback((type: Notification['type'], message: string) => {
        const newNotification: Notification = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            message,
            timestamp: new Date().toISOString(),
            read: false
        };
        setNotifications(prev => [newNotification, ...prev].slice(0, 10));
    }, []);

    const markNotificationAsRead = useCallback((id: string) => {
        setNotifications(prev => prev.map(n => 
            n.id === id ? { ...n, read: true } : n
        ));
    }, []);

    const clearNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    // User selection for bulk operations
    const toggleUserSelection = useCallback((id: string) => {
        setSelectedUsers(prev => 
            prev.includes(id) 
                ? prev.filter(uid => uid !== id)
                : [...prev, id]
        );
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedUsers([]);
    }, []);

    // Initial load
    useEffect(() => {
        refreshStats();
        // Auto refresh every 30 seconds
        const interval = setInterval(refreshStats, 30000);
        return () => clearInterval(interval);
    }, [refreshStats]);

    return (
        <AdminContext.Provider value={{
            stats,
            refreshStats,
            statsLoading,
            activityLog,
            addActivity,
            notifications,
            addNotification,
            markNotificationAsRead,
            clearNotifications,
            unreadCount,
            selectedUsers,
            setSelectedUsers,
            toggleUserSelection,
            clearSelection,
            globalLoading,
            setGlobalLoading
        }}>
            {children}
        </AdminContext.Provider>
    );
};

export const useAdmin = () => {
    const context = useContext(AdminContext);
    if (!context) throw new Error('useAdmin must be used within AdminProvider');
    return context;
};
