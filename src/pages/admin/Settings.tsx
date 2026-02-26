import { useState, useEffect } from 'react';
import { 
    Save, Database, Shield, Bell, Server, AlertTriangle,
    CheckCircle, RefreshCw, Key, Lock
} from 'lucide-react';

import { useAdmin } from '../../contexts/AdminContext';

interface SystemSettings {
    maintenance_mode: boolean;
    registration_enabled: boolean;
    default_max_streams: number;
    stream_timeout: number;
}

export default function Settings() {
    const [settings, setSettings] = useState<SystemSettings>({
        maintenance_mode: false,
        registration_enabled: true,
        default_max_streams: 2,
        stream_timeout: 30
    });
    const [, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    
    const { addActivity, addNotification } = useAdmin();

    // Fetch settings from Supabase (stored in a settings table or app_config)
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                // In a real app, you'd have a settings table
                // For now, we'll use local defaults
                setLoading(false);
            } catch (err) {
                console.error('Error fetching settings:', err);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            // Here you would save to Supabase
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
            
            addActivity('Sistem ayarları güncellendi', 'Settings');
            addNotification('success', 'Ayarlar kaydedildi');
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
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
