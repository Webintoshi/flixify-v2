import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { IPTVService } from '../lib/iptvService';

export interface Profile {
    id: string;
    account_number: string;
    subscription_ends_at: string | null;
    subscription_status: string;
    iptv_username: string | null;
    iptv_password: string | null;
    iptv_expiry_date: string | null;
    iptv_status: string;
    role: string;
    created_at: string;
}

// Split context into smaller pieces to prevent unnecessary re-renders
const AuthStateContext = createContext<{
    session: Session | null;
    user: User | null;
    loading: boolean;
}>({
    session: null,
    user: null,
    loading: true,
});

const ProfileContext = createContext<{
    profile: Profile | null;
    refreshProfile: () => Promise<void>;
}>({
    profile: null,
    refreshProfile: async () => {},
});

const AuthActionsContext = createContext<{
    signOut: () => Promise<void>;
}>({
    signOut: async () => {},
});

// Cache profile data
const profileCache = new Map<string, { profile: Profile; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [authState, setAuthState] = useState({
        session: null as Session | null,
        user: null as User | null,
        loading: true,
    });
    const [profile, setProfile] = useState<Profile | null>(null);
    const isFetchingRef = useRef(false);
    const initialLoadDone = useRef(false);

    // Stable fetchProfile function
    const fetchProfile = useCallback(async (userId: string, forceRefresh = false) => {
        if (isFetchingRef.current && !forceRefresh) return;
        isFetchingRef.current = true;

        try {
            const cached = profileCache.get(userId);
            if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_DURATION) {
                setProfile(cached.profile);
                isFetchingRef.current = false;
                return;
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (!error && data) {
                setProfile(data);
                profileCache.set(userId, { profile: data, timestamp: Date.now() });
                
                // IPTV credentials kaydet
                if (data.iptv_username && data.iptv_password) {
                    IPTVService.setCredentials(data.iptv_username, data.iptv_password);
                }
            } else if (error?.code === 'PGRST116' || error?.code === '404') {
                // Profil bulunamadı, oluşturmayı dene
                console.log('[AuthContext] Profile not found, creating...');
                const { data: userData } = await supabase.auth.getUser();
                if (userData.user) {
                    const newProfile = {
                        id: userId,
                        account_number: '53' + Math.floor(Math.random() * 10000000000).toString().padStart(10, '0'),
                        email: userData.user.email,
                        role: 'user',
                        subscription_status: 'none',
                    };
                    const { data: created, error: createError } = await supabase
                        .from('profiles')
                        .insert(newProfile)
                        .select()
                        .single();
                    
                    if (!createError && created) {
                        setProfile(created);
                        profileCache.set(userId, { profile: created, timestamp: Date.now() });
                    } else {
                        console.error('[AuthContext] Profile creation failed:', createError);
                        setProfile(null);
                    }
                }
            } else {
                console.error('[AuthContext] Profile fetch error:', error);
                setProfile(null);
            }
        } catch (err) {
            setProfile(null);
        } finally {
            isFetchingRef.current = false;
        }
    }, []);

    // Stable signOut function - NEVER changes reference
    const signOut = useCallback(async () => {
        if (authState.user?.id) {
            profileCache.delete(authState.user.id);
        }
        // IPTV credentials temizle
        IPTVService.clearCredentials();
        await supabase.auth.signOut();
    }, [authState.user?.id]);

    // Stable refreshProfile function
    const refreshProfile = useCallback(async () => {
        if (authState.user?.id) {
            await fetchProfile(authState.user.id, true);
        }
    }, [authState.user?.id, fetchProfile]);

    // Auth state listener - only runs once
    useEffect(() => {
        let mounted = true;

        // Check initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!mounted) return;
            
            setAuthState({
                session,
                user: session?.user ?? null,
                loading: false,
            });
            
            initialLoadDone.current = true;

            if (session?.user) {
                fetchProfile(session.user.id);
            }
        });

        // Subscribe to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (!mounted) return;
            
            setAuthState(prev => ({
                ...prev,
                session,
                user: session?.user ?? null,
            }));

            if (session?.user && event !== 'TOKEN_REFRESHED') {
                fetchProfile(session.user.id);
            } else if (!session) {
                setProfile(null);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [fetchProfile]);

    // REALTIME: Admin değişikliklerini anında dinle
    useEffect(() => {
        if (!authState.user?.id) return;

        console.log('[AuthContext] Realtime subscription başlatılıyor...');

        const subscription = supabase
            .channel('profile_changes')
            .on(
                'postgres_changes',
                {
                    event: '*', // INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${authState.user.id}`,
                },
                (payload) => {
                    console.log('[AuthContext] Profil değişikliği algılandı:', payload);
                    
                    if (payload.new) {
                        const newProfile = payload.new as Profile;
                        setProfile(newProfile);
                        profileCache.set(authState.user!.id, { 
                            profile: newProfile, 
                            timestamp: Date.now() 
                        });
                        
                        // IPTV credentials güncelle
                        if (newProfile.iptv_username && newProfile.iptv_password) {
                            IPTVService.setCredentials(
                                newProfile.iptv_username, 
                                newProfile.iptv_password
                            );
                            console.log('[AuthContext] IPTV credentials güncellendi');
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            console.log('[AuthContext] Realtime subscription kapatılıyor...');
            subscription.unsubscribe();
        };
    }, [authState.user?.id]);

    // Memoized state objects to prevent re-renders
    const authStateValue = useMemo(() => authState, [authState.session, authState.user, authState.loading]);
    
    const profileValue = useMemo(() => ({
        profile,
        refreshProfile,
    }), [profile, refreshProfile]);

    const actionsValue = useMemo(() => ({
        signOut,
    }), [signOut]);

    return (
        <AuthStateContext.Provider value={authStateValue}>
            <ProfileContext.Provider value={profileValue}>
                <AuthActionsContext.Provider value={actionsValue}>
                    {children}
                </AuthActionsContext.Provider>
            </ProfileContext.Provider>
        </AuthStateContext.Provider>
    );
};

// Optimized hooks - components only re-render when their specific data changes
export const useAuth = () => {
    const state = useContext(AuthStateContext);
    const profile = useContext(ProfileContext);
    const actions = useContext(AuthActionsContext);
    
    return useMemo(() => ({
        ...state,
        ...profile,
        ...actions,
    }), [state, profile, actions]);
};

// Granular hooks - use these for better performance
export const useUser = () => useContext(AuthStateContext).user;
export const useProfile = () => useContext(ProfileContext).profile;
export const useIsLoading = () => useContext(AuthStateContext).loading;
export const useSignOut = () => useContext(AuthActionsContext).signOut;
export const useRefreshProfile = () => useContext(ProfileContext).refreshProfile;

export default AuthProvider;
