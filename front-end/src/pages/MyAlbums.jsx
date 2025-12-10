import { useState, useEffect } from 'react';
import { getMyAlbums } from '../services/afterService';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ShareButtons from '../components/ShareButtons';
import './MyAlbums.css';

const MyAlbums = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [albums, setAlbums] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedAlbum, setSelectedAlbum] = useState(null);

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
                        <h2>{selectedAlbum.title}</h2>
                        <p className="modal-meta">
                            {selectedAlbum.photos?.length || 0} ảnh •
                            {' '}{new Date(selectedAlbum.created_at).toLocaleDateString('vi-VN')}
                        </p>

                        <div className="photos-grid">
                            {selectedAlbum.photos?.map((photo, index) => (
                                <div key={index} className="photo-item">
                                    <img src={photo.image_url} alt={photo.filename} />
                                </div>
                            ))}
                        </div>

                        {selectedAlbum.download_zip_url && (
                            <a
                                href={selectedAlbum.download_zip_url}
                                className="download-btn"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                📥 Tải về tất cả (ZIP)
                            </a>
                        )}

                        {/* Share Album */}
                        <ShareButtons
                            title={`Album: ${selectedAlbum.title}`}
                            text={`Xem album ${selectedAlbum.title} với ${selectedAlbum.photos?.length || 0} ảnh đẹp!`}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyAlbums;
