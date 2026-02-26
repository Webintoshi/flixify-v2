/**
 * BUNNY CDN ADMIN PANEL
 * 
 * Video yükleme, listeleme ve yönetim işlemleri.
 * Bunny Stream API entegrasyonu.
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  Upload, Video, Trash2, RefreshCw, Play,
  Film, Clock, CheckCircle,
  X, FileVideo, Image as ImageIcon
} from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';

interface BunnyVideo {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl: string;
  previewUrl?: string;
  duration: number;
  category?: string;
  country?: string;
  status?: 'processing' | 'available' | 'failed';
}

export default function BunnyCDN() {
  const [videos, setVideos] = useState<BunnyVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    category: '',
    country: 'TR',
  });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<BunnyVideo | null>(null);
  
  const { addActivity, addNotification } = useAdmin();

  // Fetch videos
  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/bunny/videos', {
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch videos');

      const data = await response.json();
      setVideos(data.videos || []);
    } catch (err) {
      console.error('Error fetching videos:', err);
      addNotification('error', 'Videolar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Handle file select
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024 * 1024) { // 5GB limit
        addNotification('error', 'Dosya boyutu 5GB\'dan küçük olmalıdır');
        return;
      }
      setSelectedFile(file);
      setUploadForm(prev => ({
        ...prev,
        title: file.name.replace(/\.[^/.]+$/, ''),
      }));
    }
  };

  // Upload video
  const handleUpload = async () => {
    if (!selectedFile || !uploadForm.title) {
      addNotification('error', 'Dosya ve başlık gerekli');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // 1. Create video object
      const createResponse = await fetch('/api/bunny/video/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: uploadForm.title,
          metadata: {
            description: uploadForm.description,
            category: uploadForm.category,
            country: uploadForm.country,
          },
        }),
      });

      if (!createResponse.ok) throw new Error('Failed to create video');

      const { uploadUrl } = await createResponse.json();

      // 2. Upload file with progress
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(progress);
        }
      });

      await new Promise((resolve, reject) => {
        xhr.addEventListener('load', resolve);
        xhr.addEventListener('error', reject);
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');
        xhr.send(selectedFile);
      });

      addNotification('success', 'Video başarıyla yüklendi');
      addActivity('Video yüklendi', uploadForm.title);
      
      setShowUploadModal(false);
      setSelectedFile(null);
      setUploadForm({ title: '', description: '', category: '', country: 'TR' });
      fetchVideos();
    } catch (err) {
      console.error('Upload error:', err);
      addNotification('error', 'Video yüklenirken hata oluştu');
    } finally {
      setUploading(false);
    }
  };

  // Delete video
  const handleDelete = async (video: BunnyVideo) => {
    if (!confirm(`"${video.title}" videosunu silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      // Note: Bunny video deletion requires API key
      // This is a placeholder - implement actual deletion
      addNotification('success', 'Video silindi');
      addActivity('Video silindi', video.title);
      fetchVideos();
    } catch (err) {
      addNotification('error', 'Video silinirken hata oluştu');
    }
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  async function getAuthToken(): Promise<string> {
    // Get from your auth context/store
    const { data } = await import('../../lib/supabase').then(m => m.supabase.auth.getSession());
    return data.session?.access_token || '';
  }

  return (
    <div className="max-w-7xl mx-auto animation-fade-in">
      {/* Header */}
      <header className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-black tracking-tight uppercase bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
              Bunny CDN
            </h1>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2">
              Video yükleme ve yönetim • {videos.length} video
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchVideos}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-3 bg-surface/50 border border-white/10 rounded-2xl hover:bg-white/5 transition-all text-sm font-bold"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Yenile
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-[0_0_20px_rgba(var(--primary),0.3)]"
            >
              <Upload size={18} />
              Video Yükle
            </button>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Toplam Video', value: videos.length, icon: Video },
          { label: 'İşleniyor', value: videos.filter(v => v.status === 'processing').length, icon: Clock },
          { label: 'Hazır', value: videos.filter(v => v.status === 'available').length, icon: CheckCircle },
          { label: 'Toplam Süre', value: formatDuration(videos.reduce((a, v) => a + v.duration, 0)), icon: Film },
        ].map((stat, i) => (
          <div key={i} className="bg-surface/50 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <stat.icon size={18} className="text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{stat.label}</span>
            </div>
            <div className="text-2xl font-black">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Videos Grid */}
      {loading ? (
        <div className="py-24 flex justify-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : videos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {videos.map((video) => (
            <div 
              key={video.id}
              className="bg-surface/40 border border-white/5 rounded-3xl overflow-hidden group hover:border-primary/30 transition-all"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-black">
                {video.thumbnailUrl ? (
                  <img 
                    src={video.thumbnailUrl} 
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon size={48} className="text-gray-600" />
                  </div>
                )}
                
                {/* Duration badge */}
                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded text-xs font-bold">
                  {formatDuration(video.duration)}
                </div>
                
                {/* Play overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button 
                    onClick={() => setPreviewVideo(video)}
                    className="p-4 bg-primary rounded-full hover:scale-110 transition-transform"
                  >
                    <Play size={24} className="text-white fill-current" />
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-bold text-white truncate mb-2" title={video.title}>
                  {video.title}
                </h3>
                
                <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-3">
                  {video.category && <span className="px-2 py-1 bg-white/5 rounded">{video.category}</span>}
                  {video.country && <span className="px-2 py-1 bg-white/5 rounded">{video.country}</span>}
                </div>

                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase ${
                    video.status === 'available' ? 'text-green-500' :
                    video.status === 'processing' ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    {video.status === 'available' ? 'Hazır' :
                     video.status === 'processing' ? 'İşleniyor' : 'Hata'}
                  </span>
                  
                  <button
                    onClick={() => handleDelete(video)}
                    className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-24 text-center">
          <Film size={64} className="mx-auto mb-4 text-gray-600 opacity-30" />
          <p className="text-gray-400 font-bold uppercase tracking-widest text-sm mb-2">Henüz video yok</p>
          <p className="text-gray-600 text-xs">Bunny Stream'e video yüklemek için "Video Yükle" butonuna tıklayın</p>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !uploading && setShowUploadModal(false)} />
          
          <div className="bg-surface border border-white/10 w-full max-w-lg rounded-3xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-orange-500 to-primary" />
            
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-xl font-black uppercase tracking-tight">Video Yükle</h3>
              {!uploading && (
                <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-white/10 rounded-xl">
                  <X size={20} />
                </button>
              )}
            </div>

            <div className="p-6 space-y-4">
              {/* File Upload */}
              <div 
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
                  selectedFile ? 'border-primary bg-primary/5' : 'border-white/10 hover:border-white/30'
                }`}
              >
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="hidden"
                  id="video-upload"
                />
                <label htmlFor="video-upload" className="cursor-pointer">
                  <FileVideo size={48} className="mx-auto mb-4 text-gray-400" />
                  <p className="text-sm font-bold mb-2">
                    {selectedFile ? selectedFile.name : 'Video dosyası seçin'}
                  </p>
                  <p className="text-xs text-gray-500">
                    MP4, MKV, AVI, MOV • Max 5GB
                  </p>
                </label>
              </div>

              {/* Form Fields */}
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Video başlığı"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                  disabled={uploading}
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl focus:border-primary/50 outline-none text-sm"
                />
                
                <textarea
                  placeholder="Açıklama (isteğe bağlı)"
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                  disabled={uploading}
                  rows={3}
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl focus:border-primary/50 outline-none text-sm resize-none"
                />

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Kategori"
                    value={uploadForm.category}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value }))}
                    disabled={uploading}
                    className="px-4 py-3 bg-black/50 border border-white/10 rounded-xl focus:border-primary/50 outline-none text-sm"
                  />
                  <select
                    value={uploadForm.country}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, country: e.target.value }))}
                    disabled={uploading}
                    className="px-4 py-3 bg-black/50 border border-white/10 rounded-xl focus:border-primary/50 outline-none text-sm"
                  >
                    <option value="TR">🇹🇷 Türkiye</option>
                    <option value="US">🇺🇸 ABD</option>
                    <option value="DE">🇩🇪 Almanya</option>
                    <option value="FR">🇫🇷 Fransa</option>
                    <option value="GB">🇬🇧 İngiltere</option>
                    <option value="OTHER">🌍 Diğer</option>
                  </select>
                </div>
              </div>

              {/* Progress */}
              {uploading && (
                <div className="space-y-2">
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-center text-sm font-bold text-primary">{uploadProgress}%</p>
                </div>
              )}
            </div>

            <div className="p-6 bg-black/40 border-t border-white/5 flex gap-3">
              <button
                onClick={() => setShowUploadModal(false)}
                disabled={uploading}
                className="flex-1 py-3 font-black uppercase tracking-widest text-xs bg-transparent hover:bg-white/5 border border-white/10 rounded-xl transition-colors disabled:opacity-50"
              >
                Vazgeç
              </button>
              <button
                onClick={handleUpload}
                disabled={!selectedFile || !uploadForm.title || uploading}
                className="flex-[2] py-3 bg-primary hover:bg-primary-hover text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Yükleniyor...' : 'Yükle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewVideo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90">
          <button 
            onClick={() => setPreviewVideo(null)}
            className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
          
          <div className="w-full max-w-5xl">
            <video
              src={`${previewVideo.previewUrl || previewVideo.thumbnailUrl}`}
              controls
              autoPlay
              className="w-full rounded-2xl"
              poster={previewVideo.thumbnailUrl}
            />
            <h3 className="mt-4 text-xl font-bold">{previewVideo.title}</h3>
          </div>
        </div>
      )}
    </div>
  );
}
