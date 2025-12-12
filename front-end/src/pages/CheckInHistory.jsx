import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDetectionHistory, syncHistory } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import './CheckInHistory.css';

const CHECKIN_HISTORY_KEY = 'checkin_history';
const TEMP_ID_KEY = 'visual_search_temp_id';

const CheckInHistory = () => {
    const { isAuthenticated } = useAuth();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState(null);
    const [syncMessage, setSyncMessage] = useState('');

    useEffect(() => {
        loadHistory();
    }, [isAuthenticated]);

    const loadHistory = async () => {
        setLoading(true);
        setError(null);

        try {
            if (isAuthenticated) {
                // Logged in: Get from server
                const data = await getDetectionHistory();
                setHistory(data || []);
            } else {
                // Guest: Get from localStorage
                const localHistory = JSON.parse(localStorage.getItem(CHECKIN_HISTORY_KEY) || '[]');
                setHistory(localHistory);
            }
        } catch (err) {
            setError(err.message);
            // Fallback to localStorage if server fails
            const localHistory = JSON.parse(localStorage.getItem(CHECKIN_HISTORY_KEY) || '[]');
            setHistory(localHistory);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        const tempId = localStorage.getItem(TEMP_ID_KEY);
        if (!tempId) {
            setSyncMessage('Không có dữ liệu để đồng bộ');
            return;
        }

        setSyncing(true);
        setSyncMessage('');

        try {
            await syncHistory(tempId);
            // Clear local data after successful sync
            localStorage.removeItem(CHECKIN_HISTORY_KEY);
            localStorage.removeItem(TEMP_ID_KEY);
            setSyncMessage('✓ Đồng bộ thành công!');
            // Reload history from server
            await loadHistory();
        } catch (err) {
            setSyncMessage('❌ Lỗi đồng bộ: ' + err.message);
        } finally {
            setSyncing(false);
        }
    };

    const clearLocalHistory = () => {
        if (confirm('Bạn có chắc muốn xóa lịch sử check-in cục bộ?')) {
            localStorage.removeItem(CHECKIN_HISTORY_KEY);
            setHistory([]);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="checkin-history-page">
            <div className="container">
                <div className="page-header">
                    <h1>📍 Lịch sử Check-in</h1>
                    <p>Các địa điểm bạn đã nhận diện qua Visual Search</p>
                </div>

                {/* Sync Section - Only for authenticated users with local data */}
                {isAuthenticated && (
                    <div className="sync-section">
                        <p>Bạn có thể đồng bộ lịch sử check-in từ thiết bị này lên tài khoản.</p>
                        <div className="sync-actions">
                            <button
                                className="btn btn-primary"
                                onClick={handleSync}
                                disabled={syncing}
                            >
                                {syncing ? 'Đang đồng bộ...' : '🔄 Đồng bộ từ thiết bị'}
                            </button>
                        </div>
                        {syncMessage && (
                            <p className={`sync-message ${syncMessage.startsWith('✓') ? 'success' : syncMessage.startsWith('❌') ? 'error' : ''}`}>
                                {syncMessage}
                            </p>
                        )}
                    </div>
                )}

                {/* Loading */}
                {loading ? (
                    <div className="loading-container">
                        <LoadingSpinner />
                    </div>
                ) : error ? (
                    <div className="error-msg">{error}</div>
                ) : history.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📷</div>
                        <h3>Chưa có lịch sử check-in</h3>
                        <p>Hãy sử dụng tính năng "Tìm bằng ảnh" để nhận diện địa điểm du lịch!</p>
                        <Link to="/visual-search" className="btn btn-primary">
                            Tìm bằng ảnh
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="history-stats">
                            <span>Tổng: {history.length} check-in</span>
                            {!isAuthenticated && (
                                <button className="btn btn-secondary btn-sm" onClick={clearLocalHistory}>
                                    Xóa lịch sử
                                </button>
                            )}
                        </div>

                        <div className="history-grid">
                            {history.map((item, index) => (
                                <div key={item.id || index} className="history-card">
                                    <div className="history-image">
                                        {item.image_url || item.landmark_info?.image_urls?.[0] ? (
                                            <img
                                                src={item.image_url || item.landmark_info?.image_urls?.[0]}
                                                alt={item.name || item.landmark_info?.name}
                                                onError={(e) => e.target.src = 'https://via.placeholder.com/300x200?text=No+Image'}
                                            />
                                        ) : (
                                            <div className="no-image">📷</div>
                                        )}
                                        {item.similarity_score && (
                                            <div className="confidence-badge">
                                                {(item.similarity_score * 100).toFixed(0)}%
                                            </div>
                                        )}
                                    </div>
                                    <div className="history-content">
                                        <h3>{item.name || item.landmark_info?.name || 'Địa điểm'}</h3>
                                        <p className="history-location">
                                            📍 {item.location_province || item.landmark_info?.location_province || 'Không rõ'}
                                        </p>
                                        {item.created_at && (
                                            <p className="history-date">
                                                🕐 {formatDate(item.created_at)}
                                            </p>
                                        )}
                                        <Link
                                            to={`/destination/${item.landmark_id || item.id}`}
                                            className="btn btn-secondary btn-sm"
                                        >
                                            Xem chi tiết
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default CheckInHistory;
