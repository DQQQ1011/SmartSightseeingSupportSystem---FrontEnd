import { useState, useEffect } from 'react';
import { getMyAlbums, createShareLink, revokeShareLink, deleteAlbum, renameAlbum } from '../services/afterService';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './MyAlbums.css';

const MyAlbums = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [albums, setAlbums] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedAlbum, setSelectedAlbum] = useState(null);
    const [shareLinks, setShareLinks] = useState({});
    const [editingTitle, setEditingTitle] = useState(null);
    const [newTitle, setNewTitle] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (user) {
            fetchAlbums();
        }
    }, [user]);

    const fetchAlbums = async () => {
        try {
            setLoading(true);
            const data = await getMyAlbums();
            setAlbums(data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Handle Share Link Creation
    const handleShare = async (albumId) => {
        try {
            setActionLoading(true);
            const result = await createShareLink(albumId);
            const shareUrl = `${window.location.origin}/shared/${result.share_token}`;
            setShareLinks(prev => ({ ...prev, [albumId]: shareUrl }));
            // Copy to clipboard
            navigator.clipboard.writeText(shareUrl);
            alert('✅ Đã tạo link chia sẻ và copy vào clipboard!');
        } catch (err) {
            alert('❌ Không thể tạo link: ' + err.message);
        } finally {
            setActionLoading(false);
        }
    };

    // Handle Stop Sharing
    const handleStopSharing = async (albumId) => {
        if (!confirm('Bạn có chắc muốn tắt chia sẻ? Link cũ sẽ không còn hoạt động.')) return;
        try {
            setActionLoading(true);
            await revokeShareLink(albumId);
            setShareLinks(prev => {
                const updated = { ...prev };
                delete updated[albumId];
                return updated;
            });
            alert('✅ Đã tắt chia sẻ album');
        } catch (err) {
            alert('❌ Lỗi: ' + err.message);
        } finally {
            setActionLoading(false);
        }
    };

    // Handle Delete Album
    const handleDelete = async (albumId) => {
        if (!confirm('⚠️ Xóa album vĩnh viễn? Hành động này không thể hoàn tác!')) return;
        try {
            setActionLoading(true);
            await deleteAlbum(albumId);
            setAlbums(prev => prev.filter(a => a.id !== albumId));
            setSelectedAlbum(null);
            alert('✅ Đã xóa album');
        } catch (err) {
            alert('❌ Lỗi: ' + err.message);
        } finally {
            setActionLoading(false);
        }
    };

    // Handle Rename Album
    const handleRename = async (albumId) => {
        if (!newTitle.trim()) return;
        try {
            setActionLoading(true);
            await renameAlbum(albumId, newTitle);
            setAlbums(prev => prev.map(a =>
                a.id === albumId ? { ...a, title: newTitle } : a
            ));
            if (selectedAlbum?.id === albumId) {
                setSelectedAlbum(prev => ({ ...prev, title: newTitle }));
            }
            setEditingTitle(null);
            setNewTitle('');
        } catch (err) {
            alert('❌ Lỗi: ' + err.message);
        } finally {
            setActionLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="my-albums">
                <div className="auth-required">
                    <h2>🔒 Yêu cầu đăng nhập</h2>
                    <p>Bạn cần đăng nhập để xem album của mình.</p>
                    <button onClick={() => navigate('/login')} className="login-btn">
                        Đăng nhập ngay
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="my-albums">
                <div className="loading">
                    <div className="spinner"></div>
                    <p>Đang tải album...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="my-albums">
            <div className="page-header">
                <h1>🖼️ Album của tôi</h1>
                <button onClick={() => navigate('/album-creator')} className="create-btn">
                    + Tạo album mới
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {albums.length === 0 ? (
                <div className="empty-state">
                    <span className="empty-icon">📷</span>
                    <h3>Chưa có album nào</h3>
                    <p>Hãy tạo album đầu tiên từ những bức ảnh du lịch của bạn!</p>
                    <button onClick={() => navigate('/album-creator')} className="create-btn large">
                        🚀 Tạo album ngay
                    </button>
                </div>
            ) : (
                <div className="albums-grid">
                    {albums.map((album) => (
                        <div
                            key={album.id}
                            className="album-card"
                            onClick={() => setSelectedAlbum(album)}
                        >
                            <div className="album-cover">
                                {album.cover_photo_url ? (
                                    <img src={album.cover_photo_url} alt={album.title} />
                                ) : (
                                    <div className="no-cover">📷</div>
                                )}
                            </div>
                            <div className="album-info">
                                <h4>{album.title}</h4>
                                <p>{album.photos?.length || 0} ảnh</p>
                                <span className="album-date">
                                    {new Date(album.created_at).toLocaleDateString('vi-VN')}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Album Detail Modal */}
            {selectedAlbum && (
                <div className="modal-overlay" onClick={() => setSelectedAlbum(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <button className="close-btn" onClick={() => setSelectedAlbum(null)}>×</button>

                        {/* Title with Edit */}
                        {editingTitle === selectedAlbum.id ? (
                            <div className="edit-title">
                                <input
                                    type="text"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="Tên album mới"
                                    autoFocus
                                />
                                <button onClick={() => handleRename(selectedAlbum.id)} disabled={actionLoading}>
                                    ✓
                                </button>
                                <button onClick={() => setEditingTitle(null)}>✕</button>
                            </div>
                        ) : (
                            <div className="title-row">
                                <h2>{selectedAlbum.title}</h2>
                                <button
                                    className="icon-btn"
                                    onClick={() => {
                                        setEditingTitle(selectedAlbum.id);
                                        setNewTitle(selectedAlbum.title);
                                    }}
                                    title="Đổi tên"
                                >
                                    ✏️
                                </button>
                            </div>
                        )}

                        <p className="modal-meta">
                            {selectedAlbum.photos?.length || 0} ảnh •
                            {' '}{new Date(selectedAlbum.created_at).toLocaleDateString('vi-VN')}
                        </p>

                        {/* Photos Grid */}
                        <div className="photos-grid">
                            {selectedAlbum.photos?.map((photo, index) => (
                                <div key={index} className="photo-item">
                                    <img src={photo.image_url} alt={photo.filename} />
                                </div>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="album-actions">
                            {selectedAlbum.download_zip_url && (
                                <a
                                    href={selectedAlbum.download_zip_url}
                                    className="action-btn download"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    📥 Tải về ZIP
                                </a>
                            )}

                            {/* Share Button */}
                            {shareLinks[selectedAlbum.id] ? (
                                <div className="share-section">
                                    <input
                                        type="text"
                                        value={shareLinks[selectedAlbum.id]}
                                        readOnly
                                        onClick={(e) => {
                                            e.target.select();
                                            navigator.clipboard.writeText(e.target.value);
                                        }}
                                    />
                                    <button
                                        className="action-btn danger"
                                        onClick={() => handleStopSharing(selectedAlbum.id)}
                                        disabled={actionLoading}
                                    >
                                        🚫 Tắt chia sẻ
                                    </button>
                                </div>
                            ) : (
                                <button
                                    className="action-btn share"
                                    onClick={() => handleShare(selectedAlbum.id)}
                                    disabled={actionLoading}
                                >
                                    🔗 Tạo link chia sẻ
                                </button>
                            )}

                            {/* Delete Button */}
                            <button
                                className="action-btn danger"
                                onClick={() => handleDelete(selectedAlbum.id)}
                                disabled={actionLoading}
                            >
                                🗑️ Xóa album
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyAlbums;

