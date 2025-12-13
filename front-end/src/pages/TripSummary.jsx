import { useState, useEffect } from 'react';
import { getMyAlbums, createTripSummary, getSummaryHistory } from '../services/afterService';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ShareButtons from '../components/ShareButtons';
import './TripSummary.css';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom photo marker icon
const createPhotoIcon = (photoUrl, index, isStart, isEnd) => {
    const color = isStart ? '#10b981' : isEnd ? '#ef4444' : '#3b82f6';

    if (photoUrl) {
        return L.divIcon({
            className: 'custom-photo-marker',
            html: `
                <div class="photo-marker ${isStart ? 'start' : ''} ${isEnd ? 'end' : ''}" style="border-color: ${color}">
                    <img src="${photoUrl}" alt="Point ${index + 1}" />
                    <div class="marker-badge" style="background: ${color}">${index + 1}</div>
                </div>
            `,
            iconSize: [50, 50],
            iconAnchor: [25, 25],
            popupAnchor: [0, -25],
        });
    }

    return L.divIcon({
        className: 'custom-photo-marker',
        html: `
            <div class="photo-marker ${isStart ? 'start' : ''} ${isEnd ? 'end' : ''}" style="border-color: ${color}">
                <div class="marker-number" style="color: ${color}">${index + 1}</div>
                <div class="marker-badge" style="background: ${color}">${index + 1}</div>
            </div>
        `,
        iconSize: [50, 50],
        iconAnchor: [25, 25],
        popupAnchor: [0, -25],
    });
};

const TripSummary = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [albums, setAlbums] = useState([]);
    const [selectedAlbums, setSelectedAlbums] = useState([]);
    const [summaries, setSummaries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [currentSummary, setCurrentSummary] = useState(null);
    const [error, setError] = useState(null);
    const [tab, setTab] = useState('create'); // create, history

    // NEW: Manual location state
    const [step, setStep] = useState(1); // 1: select albums, 2: add locations, 3: summary
    const [manualLocations, setManualLocations] = useState([]);
    const [editingLocation, setEditingLocation] = useState(null);
    const [locationInput, setLocationInput] = useState({ name: '', lat: '', lon: '' });

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [albumsData, historyData] = await Promise.all([
                getMyAlbums(),
                getSummaryHistory(user.user_id),
            ]);
            setAlbums(albumsData || []);
            setSummaries(historyData || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleAlbum = (albumId) => {
        setSelectedAlbums(prev =>
            prev.includes(albumId)
                ? prev.filter(id => id !== albumId)
                : [...prev, albumId]
        );
    };

    // Check which albums need manual location
    const getAlbumsNeedingLocation = () => {
        const selectedData = albums.filter(a => selectedAlbums.includes(a.id));
        return selectedData.filter(album => {
            // Check if any photo has GPS
            const hasGPS = album.photos?.some(p => p.lat && p.lon);
            return !hasGPS;
        });
    };

    // Handle proceeding to step 2 or generating
    const handleProceed = () => {
        const needsLocation = getAlbumsNeedingLocation();
        if (needsLocation.length > 0) {
            // Go to step 2 for manual location input
            setStep(2);
        } else {
            // No manual locations needed, generate directly
            handleGenerate();
        }
    };

    // Save manual location
    const saveManualLocation = () => {
        if (!locationInput.name.trim()) return;

        const lat = parseFloat(locationInput.lat) || 0;
        const lon = parseFloat(locationInput.lon) || 0;

        setManualLocations(prev => [
            ...prev.filter(l => l.album_title !== editingLocation),
            {
                album_title: editingLocation,
                name: locationInput.name,
                lat: lat,
                lon: lon
            }
        ]);
        setEditingLocation(null);
        setLocationInput({ name: '', lat: '', lon: '' });
    };

    const handleGenerate = async () => {
        if (selectedAlbums.length === 0) {
            setError('Vui lòng chọn ít nhất 1 album');
            return;
        }

        setGenerating(true);
        setError(null);

        try {
            // Get selected albums data
            const albumData = albums.filter(a => selectedAlbums.includes(a.id));

            const result = await createTripSummary(
                {
                    albums: albumData.map(a => ({
                        title: a.title,
                        photos: a.photos || [],
                    })),
                },
                manualLocations // Pass manual locations
            );

            setCurrentSummary(result);
            setSummaries(prev => [result, ...prev]);
            setStep(3); // Go to summary view
        } catch (err) {
            setError(err.message || 'Có lỗi xảy ra khi tạo summary');
        } finally {
            setGenerating(false);
        }
    };

    // Get photo for a point (from selected albums)
    const getPhotoForPoint = (pointIndex) => {
        const selectedAlbumsData = albums.filter(a => selectedAlbums.includes(a.id));
        if (selectedAlbumsData[pointIndex]?.photos?.[0]?.image_url) {
            return selectedAlbumsData[pointIndex].photos[0].image_url;
        }
        if (selectedAlbumsData[pointIndex]?.cover_photo_url) {
            return selectedAlbumsData[pointIndex].cover_photo_url;
        }
        return null;
    };

    // Calculate map center and bounds
    const getMapCenter = () => {
        if (!currentSummary?.points?.length) {
            return [16.047079, 108.206230]; // Default: Da Nang
        }
        const lats = currentSummary.points.map(p => p[0]);
        const lons = currentSummary.points.map(p => p[1]);
        return [
            lats.reduce((a, b) => a + b, 0) / lats.length,
            lons.reduce((a, b) => a + b, 0) / lons.length,
        ];
    };

    const getMapBounds = () => {
        if (!currentSummary?.points?.length || currentSummary.points.length < 2) {
            return null;
        }
        return currentSummary.points.map(p => [p[0], p[1]]);
    };

    if (!user) {
        return (
            <div className="trip-summary">
                <div className="auth-required">
                    <h2>🔒 Yêu cầu đăng nhập</h2>
                    <p>Bạn cần đăng nhập để sử dụng tính năng này.</p>
                    <button onClick={() => navigate('/login')} className="login-btn">
                        Đăng nhập ngay
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="trip-summary">
                <div className="loading">
                    <div className="spinner"></div>
                    <p>Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    const mapCenter = getMapCenter();
    const mapBounds = getMapBounds();

    return (
        <div className="trip-summary">
            <div className="page-header">
                <h1>🗺️ Tổng kết chuyến đi</h1>
                <p>Tạo bản tổng kết chuyến đi từ album ảnh của bạn</p>
            </div>

            <div className="tabs">
                <button
                    className={`tab ${tab === 'create' ? 'active' : ''}`}
                    onClick={() => setTab('create')}
                >
                    ✨ Tạo mới
                </button>
                <button
                    className={`tab ${tab === 'history' ? 'active' : ''}`}
                    onClick={() => setTab('history')}
                >
                    📜 Lịch sử ({summaries.length})
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {/* Step Indicator */}
            {!currentSummary && step < 3 && (
                <div className="step-indicator">
                    <div className={`step-item ${step >= 1 ? 'active' : ''}`}>
                        <span className="step-num">1</span>
                        <span className="step-label">Chọn album</span>
                    </div>
                    <div className="step-line"></div>
                    <div className={`step-item ${step >= 2 ? 'active' : ''}`}>
                        <span className="step-num">2</span>
                        <span className="step-label">Thêm vị trí</span>
                    </div>
                    <div className="step-line"></div>
                    <div className={`step-item ${step >= 3 ? 'active' : ''}`}>
                        <span className="step-num">3</span>
                        <span className="step-label">Xem kết quả</span>
                    </div>
                </div>
            )}

            {/* Step 1: Select Albums */}
            {step === 1 && (
                <>
                    <h3>📷 Chọn album để tạo summary</h3>
                    {albums.length === 0 ? (
                        <div className="empty-state">
                            <p>Chưa có album nào. Hãy tạo album trước!</p>
                            <button onClick={() => navigate('/album-creator')} className="create-btn">
                                Tạo album
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="albums-select">
                                {albums.map((album) => {
                                    const hasGPS = album.photos?.some(p => p.lat && p.lon);
                                    return (
                                        <div
                                            key={album.id}
                                            className={`album-option ${selectedAlbums.includes(album.id) ? 'selected' : ''}`}
                                            onClick={() => toggleAlbum(album.id)}
                                        >
                                            <div className="album-thumb">
                                                {album.cover_photo_url ? (
                                                    <img src={album.cover_photo_url} alt={album.title} />
                                                ) : (
                                                    <div className="no-thumb">📷</div>
                                                )}
                                            </div>
                                            <div className="album-details">
                                                <strong>{album.title}</strong>
                                                <span>{album.photos?.length || 0} ảnh</span>
                                                {!hasGPS && (
                                                    <span className="no-gps-badge">⚠️ Thiếu GPS</span>
                                                )}
                                            </div>
                                            <div className="check-mark">✓</div>
                                        </div>
                                    );
                                })}
                            </div>

                            <button
                                className="generate-btn"
                                onClick={handleProceed}
                                disabled={generating || selectedAlbums.length === 0}
                            >
                                {generating ? (
                                    <>⏳ Đang xử lý...</>
                                ) : (
                                    <>➡️ Tiếp tục ({selectedAlbums.length} album)</>
                                )}
                            </button>
                        </>
                    )}
                </>
            )}

            {/* Step 2: Manual Location Input */}
            {step === 2 && (
                <div className="manual-location-step">
                    <button className="back-btn" onClick={() => setStep(1)}>
                        ← Quay lại
                    </button>
                    <h3>📍 Thêm vị trí cho album thiếu GPS</h3>
                    <p className="step-desc">
                        Một số album chưa có thông tin GPS. Vui lòng thêm vị trí để tạo bản đồ chính xác.
                    </p>

                    <div className="location-list">
                        {getAlbumsNeedingLocation().map((album) => {
                            const savedLocation = manualLocations.find(l => l.album_title === album.title);
                            return (
                                <div key={album.id} className="location-item">
                                    <div className="location-album">
                                        <div className="album-thumb small">
                                            {album.cover_photo_url ? (
                                                <img src={album.cover_photo_url} alt={album.title} />
                                            ) : (
                                                <div className="no-thumb">📷</div>
                                            )}
                                        </div>
                                        <div className="album-info">
                                            <strong>{album.title}</strong>
                                            <span>{album.photos?.length || 0} ảnh</span>
                                        </div>
                                    </div>
                                    {savedLocation ? (
                                        <div className="saved-location">
                                            <span className="location-name">📍 {savedLocation.name}</span>
                                            <button onClick={() => {
                                                setEditingLocation(album.title);
                                                setLocationInput({
                                                    name: savedLocation.name,
                                                    lat: savedLocation.lat.toString(),
                                                    lon: savedLocation.lon.toString()
                                                });
                                            }}>Sửa</button>
                                        </div>
                                    ) : (
                                        <button
                                            className="add-location-btn"
                                            onClick={() => setEditingLocation(album.title)}
                                        >
                                            + Thêm vị trí
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <button
                        className="generate-btn"
                        onClick={handleGenerate}
                        disabled={generating}
                    >
                        {generating ? (
                            <>⏳ Đang tạo summary...</>
                        ) : (
                            <>🚀 Tạo tổng kết</>
                        )}
                    </button>
                </div>
            )}

            {/* Step 3: Summary Result */}
            {(step === 3 || currentSummary) && currentSummary && (
                <div className="summary-result with-template">
                    {/* Beautiful Template Background */}
                    <div className="template-bg">
                        <div className="bg-shape shape-1"></div>
                        <div className="bg-shape shape-2"></div>
                        <div className="bg-shape shape-3"></div>
                    </div>

                    <div className="summary-content">
                        <div className="summary-header">
                            <span className="success-icon">✅</span>
                            <h2>{currentSummary.trip_title}</h2>
                        </div>

                        <div className="summary-stats">
                            <div className="stat">
                                <span className="stat-value">{currentSummary.total_locations}</span>
                                <span className="stat-label">Địa điểm</span>
                            </div>
                            <div className="stat">
                                <span className="stat-value">{currentSummary.total_photos}</span>
                                <span className="stat-label">Ảnh</span>
                            </div>
                            <div className="stat">
                                <span className="stat-value">{currentSummary.total_distance_km?.toFixed(1) || 0} km</span>
                                <span className="stat-label">Quãng đường</span>
                            </div>
                        </div>

                        <div className="summary-dates">
                            📅 {currentSummary.start_date} → {currentSummary.end_date}
                        </div>

                        {/* Interactive Map with Photo Overlays */}
                        {currentSummary.points?.length > 0 && (
                            <div className="map-section interactive-map">
                                <h3>🗺️ Bản đồ hành trình</h3>
                                <div className="map-container">
                                    <MapContainer
                                        center={mapCenter}
                                        zoom={6}
                                        style={{ height: '500px', width: '100%' }}
                                        bounds={mapBounds}
                                        boundsOptions={{ padding: [50, 50] }}
                                    >
                                        <TileLayer
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        />

                                        {/* Route Line */}
                                        <Polyline
                                            positions={currentSummary.points.map(p => [p[0], p[1]])}
                                            color="#3b82f6"
                                            weight={4}
                                            opacity={0.8}
                                        />

                                        {/* Photo Markers */}
                                        {currentSummary.points.map((point, index) => {
                                            const photoUrl = getPhotoForPoint(index);
                                            const isStart = index === 0;
                                            const isEnd = index === currentSummary.points.length - 1;
                                            const icon = createPhotoIcon(photoUrl, index, isStart, isEnd);

                                            return (
                                                <Marker
                                                    key={index}
                                                    position={[point[0], point[1]]}
                                                    icon={icon}
                                                >
                                                    <Popup>
                                                        <div className="marker-popup">
                                                            {photoUrl && (
                                                                <img src={photoUrl} alt={currentSummary.timeline[index]} />
                                                            )}
                                                            <h4>{currentSummary.timeline[index] || `Điểm ${index + 1}`}</h4>
                                                            <span className="popup-index">Điểm {index + 1}</span>
                                                        </div>
                                                    </Popup>
                                                </Marker>
                                            );
                                        })}
                                    </MapContainer>

                                    <div className="map-legend">
                                        <div className="legend-item">
                                            <span className="legend-marker start"></span>
                                            <span>Điểm bắt đầu</span>
                                        </div>
                                        <div className="legend-item">
                                            <span className="legend-marker end"></span>
                                            <span>Điểm kết thúc</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {currentSummary.timeline && currentSummary.timeline.length > 0 && (
                            <div className="timeline-section">
                                <h3>📍 Timeline</h3>
                                <ul className="timeline">
                                    {currentSummary.timeline.map((item, index) => (
                                        <li key={index} className="timeline-item">
                                            <span className="timeline-number">{index + 1}</span>
                                            <span className="timeline-name">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Share Buttons */}
                        <ShareButtons
                            title={currentSummary.trip_title}
                            text={`${currentSummary.trip_title} - ${currentSummary.total_locations} địa điểm, ${currentSummary.total_distance_km?.toFixed(1) || 0}km`}
                        />

                        <button onClick={() => {
                            setCurrentSummary(null);
                            setStep(1);
                            setSelectedAlbums([]);
                            setManualLocations([]);
                        }} className="new-summary-btn">
                            + Tạo summary mới
                        </button>
                    </div>
                </div>
            )}

            {/* Location Input Modal */}
            {editingLocation && (
                <div className="modal-overlay" onClick={() => setEditingLocation(null)}>
                    <div className="location-modal" onClick={e => e.stopPropagation()}>
                        <button className="close-btn" onClick={() => setEditingLocation(null)}>×</button>
                        <h3>📍 Thêm vị trí cho "{editingLocation}"</h3>

                        <div className="modal-form">
                            <div className="form-group">
                                <label>Tên địa điểm *</label>
                                <input
                                    type="text"
                                    value={locationInput.name}
                                    onChange={(e) => setLocationInput(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="VD: Hồ Tây, Cầu Rồng, Chợ Bến Thành..."
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Vĩ độ (Latitude)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={locationInput.lat}
                                        onChange={(e) => setLocationInput(prev => ({ ...prev, lat: e.target.value }))}
                                        placeholder="VD: 21.0582"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Kinh độ (Longitude)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={locationInput.lon}
                                        onChange={(e) => setLocationInput(prev => ({ ...prev, lon: e.target.value }))}
                                        placeholder="VD: 105.8239"
                                    />
                                </div>
                            </div>
                            <p className="form-hint">💡 Bạn có thể tìm tọa độ trên Google Maps</p>

                            <button
                                className="save-btn"
                                onClick={saveManualLocation}
                                disabled={!locationInput.name.trim()}
                            >
                                💾 Lưu vị trí
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* History Tab */}
            {tab === 'history' && (
                <div className="history-section">
                    {summaries.length === 0 ? (
                        <div className="empty-state">
                            <p>Chưa có lịch sử tổng kết nào.</p>
                        </div>
                    ) : (
                        <div className="summaries-list">
                            {summaries.map((summary, index) => (
                                <div key={index} className="summary-card" onClick={() => {
                                    setCurrentSummary(summary);
                                    setStep(3);
                                    setTab('create');
                                }}>
                                    <h4>{summary.trip_title}</h4>
                                    <div className="summary-meta">
                                        <span>{summary.total_locations} địa điểm</span>
                                        <span>•</span>
                                        <span>{summary.total_distance_km?.toFixed(1)} km</span>
                                        <span>•</span>
                                        <span>{summary.start_date} → {summary.end_date}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TripSummary;

