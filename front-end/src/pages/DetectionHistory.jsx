import { useState, useEffect } from 'react';
import { getDetectionHistory } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import ShareButtons from '../components/ShareButtons';
import './DetectionHistory.css';

const DetectionHistory = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (user) {
            fetchHistory();
        }
    }, [user]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const data = await getDetectionHistory();
            setHistory(data.history || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="detection-history">
                <div className="auth-required">
                    <h2>🔒 Yêu cầu đăng nhập</h2>
                    <p>Bạn cần đăng nhập để xem lịch sử nhận diện.</p>
                    <button onClick={() => navigate('/login')} className="login-btn">
                        Đăng nhập ngay
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="detection-history">
                <div className="loading">
                    <div className="spinner"></div>
                    <p>Đang tải lịch sử...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="detection-history">
            <div className="page-header">
                <h1>📸 Lịch sử nhận diện</h1>
                <button onClick={() => navigate('/visual-search')} className="search-btn">
                    + Nhận diện mới
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {history.length === 0 ? (
                <div className="empty-state">
                    <span className="empty-icon">🔍</span>
                    <h3>Chưa có lịch sử nhận diện</h3>
                    <p>Hãy thử tính năng nhận diện địa điểm bằng hình ảnh!</p>
                    <button onClick={() => navigate('/visual-search')} className="search-btn large">
                        📷 Nhận diện ngay
                    </button>
                </div>
            ) : (
                <div className="history-list">
                    {history.map((item, index) => (
                        <div key={index} className="history-item">
                            <div className="item-image">
                                <img src={item.user_image_url} alt="Uploaded" />
                            </div>
                            <div className="item-info">
                                <h4>{item.name}</h4>
                                <div className="item-meta">
                                    <span className="score">
                                        🎯 {(item.similarity_score * 100).toFixed(1)}%
                                    </span>
                                    <span className="date">
                                        {new Date(item.timestamp).toLocaleString('vi-VN')}
                                    </span>
                                </div>
                            </div>
                            <div className="item-actions">
                                <ShareButtons
                                    title={`Khám phá ${item.name}`}
                                    text={`Tôi đã khám phá ${item.name} với Smart Sightseeing lúc ${new Date(item.timestamp).toLocaleString('vi-VN')} tại ${item.location_province || 'Việt Nam'}!`}
                                    url={`${window.location.origin}/destination/${item.landmark_id}`}
                                    ogUrl={`${window.location.origin}/api/og/${item.landmark_id}`}
                                    userImageUrl={item.user_image_url}
                                    timestamp={item.timestamp}
                                    compact={true}
                                />
                                <Link
                                    to={`/destination/${item.landmark_id}`}
                                    className="view-btn"
                                >
                                    Xem chi tiết →
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DetectionHistory;
