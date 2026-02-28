import { useState, useEffect } from 'react';
import { 
    Save, Database, Shield, Bell, Server, AlertTriangle,
    CheckCircle, RefreshCw, Key, Lock, Globe, Zap
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAdmin } from '../../contexts/AdminContext';

interface SystemSettings {
    maintenance_mode: boolean;
    registration_enabled: boolean;
    default_max_streams: number;
    stream_timeout: number;
    stream_proxy_mode: 'bunny' | 'direct';
}

// Default settings
const defaultSettings: SystemSettings = {
    maintenance_mode: false,
    registration_enabled: true,
    default_max_streams: 2,
    stream_timeout: 30,
    stream_proxy_mode: 'bunny'
};

// Settings key mapping
const SETTINGS_KEYS: Record<keyof SystemSettings, string> = {
    maintenance_mode: 'maintenance_mode',
    registration_enabled: 'registration_enabled',
    default_max_streams: 'default_max_streams',
    stream_timeout: 'stream_timeout',
    stream_proxy_mode: 'stream_proxy_mode'
};

export default function Settings() {
    const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    
    const { addActivity, addNotification } = useAdmin();

    // Fetch settings from Supabase
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data, error } = await supabase
                    .from('system_settings')
                    .select('key, value');

                if (error) {
                    console.error('Error fetching settings:', error);
                    addNotification('error', 'Ayarlar yüklenemedi');
                } else if (data) {
                    // Convert array to object
                    const settingsMap: Partial<SystemSettings> = {};
                    data.forEach((item: any) => {
                        const key = Object.keys(SETTINGS_KEYS).find(
                            k => SETTINGS_KEYS[k as keyof SystemSettings] === item.key
                        ) as keyof SystemSettings | undefined;
                        
                        if (key) {
                            let value = item.value;
                            // Parse JSON values
                            if (typeof value === 'string') {
                                try {
                                    value = JSON.parse(value);
                                } catch {
                                    // Keep as string
                                }
                            }
                            
                            // Type conversions
                            if (key === 'maintenance_mode' || key === 'registration_enabled') {
                                settingsMap[key] = value === true || value === 'true';
                            } else if (key === 'default_max_streams' || key === 'stream_timeout') {
                                settingsMap[key] = parseInt(value) || defaultSettings[key];
                            } else {
                                settingsMap[key] = value;
                            }
                        }
                    });
                    
                    setSettings({ ...defaultSettings, ...settingsMap });
                }
            } catch (err) {
                console.error('Error fetching settings:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const updates = Object.entries(SETTINGS_KEYS).map(([settingKey, dbKey]) => ({
                key: dbKey,
                value: JSON.stringify(settings[settingKey as keyof SystemSettings])
            }));

            // Upsert all settings
            const { error } = await supabase
                .from('system_settings')
                .upsert(updates, { onConflict: 'key' });

            if (error) throw error;
            
            addActivity('Sistem ayarları güncellendi', 'Settings');
            addNotification('success', 'Ayarlar kaydedildi');
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            console.error('Error saving settings:', err);
            addNotification('error', 'Ayarlar kaydedilemedi');
        } finally {
            setSaving(false);
        }
    };

    const SettingCard = ({ 
        title, description, icon: Icon, children 
    }: { 
        title: string; 
        description: string; 
        icon: any;
        children: React.ReactNode;
    }) => (
        <div className="bg-surface/40 border border-white/5 rounded-3xl p-6 backdrop-blur-xl">
            <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                    <Icon size={24} className="text-primary" />
                </div>
                <div>
                    <h3 className="text-lg font-black uppercase tracking-tight">{title}</h3>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mt-1">{description}</p>
                </div>
            </div>
            {children}
        </div>
    );

    const Toggle = ({ 
        checked, onChange, label 
    }: { 
        checked: boolean; 
        onChange: (v: boolean) => void;
        label: string;
    }) => (
        <label className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5 cursor-pointer hover:border-white/10 transition-colors">
            <span className="text-sm font-bold">{label}</span>
            <div className={`w-12 h-6 rounded-full transition-colors relative ${checked ? 'bg-primary' : 'bg-white/10'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${checked ? 'left-7' : 'left-1'}`} />
            </div>
            <input 
                type="checkbox" 
                checked={checked} 
                onChange={(e) => onChange(e.target.checked)}
                className="hidden"
            />
        </label>
    );

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto flex items-center justify-center h-96">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto animation-fade-in">
            {/* Header */}
            <header className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl lg:text-4xl font-black tracking-tight uppercase bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
                            Sistem Ayarları
                        </h1>
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2">
                            Platform yapılandırması ve yönetimi
                        </p>
                    </div>
                    
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-sm transition-all ${
                            saveSuccess 
                                ? 'bg-green-500 text-white' 
                                : 'bg-primary hover:bg-primary-hover text-white'
                        } disabled:opacity-50`}
                    >
                        {saving ? (
                            <RefreshCw size={18} className="animate-spin" />
                        ) : saveSuccess ? (
                            <CheckCircle size={18} />
                        ) : (
                            <Save size={18} />
                        )}
                        {saving ? 'Kaydediliyor...' : saveSuccess ? 'Kaydedildi!' : 'Ayarları Kaydet'}
                    </button>
                </div>
            </header>

            {/* Settings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* General Settings */}
                <SettingCard 
                    title="Genel Ayarlar"
                    description="Platform genel davranışları"
                    icon={Server}
                >
                    <div className="space-y-3">
                        <Toggle 
                            label="Bakım Modu"
                            checked={settings.maintenance_mode}
                            onChange={(v) => setSettings(s => ({ ...s, maintenance_mode: v }))}
                        />
                        <Toggle 
                            label="Yeni Kayıtlara İzin Ver"
                            checked={settings.registration_enabled}
                            onChange={(v) => setSettings(s => ({ ...s, registration_enabled: v }))}
                        />
                    </div>
                    
                    {settings.maintenance_mode && (
                        <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-start gap-3">
                            <AlertTriangle size={18} className="text-yellow-500 shrink-0 mt-0.5" />
                            <div className="text-xs text-yellow-400">
                                <strong>Bakım Modu Aktif</strong> - Kullanıcılar şu anda platforma erişemeyecek.
                            </div>
                        </div>
                    )}
                </SettingCard>

                {/* Stream Settings */}
                <SettingCard 
                    title="Yayın Ayarları"
                    description="IPTV ve stream yapılandırması"
                    icon={Database}
                >
                    <div className="space-y-4">
                        <div>
                            <label className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-gray-400 mb-3">
                                <Key size={14} className="text-primary" />
                                Varsayılan Ekran Limiti
                            </label>
                            <div className="flex items-center gap-4">
                                <input
                                    type="range"
                                    min="1"
                                    max="5"
                                    value={settings.default_max_streams}
                                    onChange={(e) => setSettings(s => ({ ...s, default_max_streams: parseInt(e.target.value) }))}
                                    className="flex-1 h-2 bg-white/10 rounded-lg accent-primary"
                                />
                                <span className="w-10 text-center text-xl font-black text-primary">
                                    {settings.default_max_streams}
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-gray-400 mb-3">
                                <RefreshCw size={14} className="text-primary" />
                                Stream Timeout (saniye)
                            </label>
                            <input
                                type="number"
                                min="10"
                                max="120"
                                value={settings.stream_timeout}
                                onChange={(e) => setSettings(s => ({ ...s, stream_timeout: parseInt(e.target.value) }))}
                                className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-sm font-bold"
                            />
                        </div>
                    </div>
                </SettingCard>

                {/* CDN / Stream Proxy Settings */}
                <SettingCard 
                    title="CDN Proxy Ayarları"
                    description="IPTV stream proxy yapılandırması"
                    icon={Globe}
                >
                    <div className="space-y-4">
                        <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl">
                            <div className="flex items-center gap-2 mb-2">
                                <Zap size={16} className="text-primary" />
                                <span className="text-sm font-bold text-primary">Bunny CDN Proxy</span>
                            </div>
                            <p className="text-xs text-gray-400 mb-4">
                                IPTV stream'lerinizi Bunny CDN üzerinden proxy ederek daha hızlı ve stabil yayın sağlayın. 
                                Video depolanmaz, sadece edge cache kullanılır.
                            </p>
                            
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSettings(s => ({ ...s, stream_proxy_mode: 'bunny' }))}
                                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                        settings.stream_proxy_mode === 'bunny'
                                            ? 'bg-primary text-white'
                                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                    }`}
                                >
                                    Bunny CDN
                                </button>
                                <button
                                    onClick={() => setSettings(s => ({ ...s, stream_proxy_mode: 'direct' }))}
                                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                        settings.stream_proxy_mode === 'direct'
                                            ? 'bg-primary text-white'
                                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                    }`}
                                >
                                    Direkt (IPTV)
                                </button>
                            </div>
                        </div>

                        {settings.stream_proxy_mode === 'bunny' && (
                            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-2xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle size={16} className="text-green-500" />
                                    <span className="text-sm font-bold text-green-500">Aktif</span>
                                </div>
                                <p className="text-xs text-green-400/80">
                                    Stream'ler Bunny CDN üzerinden proxy ediliyor. 
                                    Daha hızlı bağlantı ve global edge cache avantajı.
                                </p>
                            </div>
                        )}

                        {settings.stream_proxy_mode === 'direct' && (
                            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertTriangle size={16} className="text-yellow-500" />
                                    <span className="text-sm font-bold text-yellow-500">Direkt Mod</span>
                                </div>
                                <p className="text-xs text-yellow-400/80">
                                    Stream'ler doğrudan IPTV provider'dan çekiliyor. 
                                    CDN optimizasyonu devre dışı.
                                </p>
                            </div>
                        )}
                    </div>
                </SettingCard>

                {/* Security Settings */}
                <SettingCard 
                    title="Güvenlik"
                    description="Güvenlik ve erişim kontrolleri"
                    icon={Shield}
                >
                    <div className="space-y-3">
                        <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-bold">Admin IP Kısıtlaması</span>
                                <span className="text-[10px] bg-gray-500/20 text-gray-400 px-2 py-1 rounded uppercase">Yakında</span>
                            </div>
                            <p className="text-xs text-gray-500">
                                Belirli IP adreslerinden admin panel erişimini kısıtla
                            </p>
                        </div>
                        
                        <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-bold">İki Faktörlü Doğrulama</span>
                                <span className="text-[10px] bg-gray-500/20 text-gray-400 px-2 py-1 rounded uppercase">Yakında</span>
                            </div>
                            <p className="text-xs text-gray-500">
                                Admin hesapları için 2FA zorunluluğu
                            </p>
                        </div>
                    </div>
                </SettingCard>

                {/* Notifications */}
                <SettingCard 
                    title="Bildirimler"
                    description="E-posta ve sistem bildirimleri"
                    icon={Bell}
                >
                    <div className="space-y-3">
                        <Toggle 
                            label="Yeni Kayıt Bildirimleri"
                            checked={true}
                            onChange={() => {}}
                        />
                        <Toggle 
                            label="Yasaklama Bildirimleri"
                            checked={true}
                            onChange={() => {}}
                        />
                        <Toggle 
                            label="Sistem Hataları"
                            checked={true}
                            onChange={() => {}}
                        />
                    </div>
                </SettingCard>
            </div>

            {/* System Info */}
            <div className="mt-8 p-6 bg-surface/40 border border-white/5 rounded-3xl backdrop-blur-xl">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                        <Lock size={24} className="text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black uppercase tracking-tight">Sistem Bilgisi</h3>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mt-1">Teknik detaylar</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Supabase Project', value: 'sdsvnkvmfhaubgcahvzv' },
                        { label: 'Region', value: 'eu-central-1' },
                        { label: 'App Version', value: '2.0.0' },
                        { label: 'Build Date', value: new Date().toLocaleDateString('tr-TR') }
                    ].map((item) => (
                        <div key={item.label} className="p-4 bg-black/40 rounded-2xl border border-white/5">
                            <div className="text-[10px] text-gray-500 font-black uppercase tracking-wider mb-1">{item.label}</div>
                            <div className="text-sm font-bold text-white font-mono truncate">{item.value}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
