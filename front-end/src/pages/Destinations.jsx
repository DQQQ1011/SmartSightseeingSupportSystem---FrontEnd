import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getDestinations, semanticSearch } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import './Destinations.css';

// Filter options: { value: for API (lowercase), label: display }
const FILTER_OPTIONS = {
    budget_range: [
        { value: 'thấp', label: 'Thấp (< 100K VNĐ)' },
        { value: 'trung bình', label: 'Trung bình (100K - 500K VNĐ)' },
        { value: 'cao', label: 'Cao (> 500K VNĐ)' }
    ],
    available_time: [
        { value: '1-2 giờ', label: '1-2 giờ' },
        { value: '2-4 giờ', label: '2-4 giờ' },
        { value: '4-8 giờ', label: '4-8 giờ' },
        { value: '8-24 giờ', label: 'Cả ngày (8-24 giờ)' }
    ],
    companion_tag: [
        { value: 'một mình', label: 'Một mình' },
        { value: 'cặp đôi', label: 'Cặp đôi' },
        { value: 'gia đình', label: 'Gia đình' },
        { value: 'nhóm bạn bè', label: 'Nhóm bạn bè' }
    ],
    season_tag: [
        { value: 'quanh năm', label: 'Quanh năm' },
        { value: 'xuân', label: 'Xuân' },
        { value: 'hạ', label: 'Hạ' },
        { value: 'thu', label: 'Thu' },
        { value: 'đông', label: 'Đông' }
    ]
};

// Provinces from data.csv (exact values)
const PROVINCES = [
    'Thành phố Hà Nội', 'Thành phố Hồ Chí Minh', 'Thành phố Đà Nẵng', 'Thành phố Cần Thơ', 'Thành phố Hải Phòng',
    'An Giang', 'Bà Rịa - Vũng Tàu', 'Bắc Giang', 'Bắc Kạn', 'Bạc Liêu',
    'Bắc Ninh', 'Bến Tre', 'Bình Định', 'Bình Dương', 'Bình Phước',
    'Bình Thuận', 'Cà Mau', 'Cao Bằng', 'Đắk Lắk', 'Đắk Nông',
    'Điện Biên', 'Đồng Nai', 'Đồng Tháp', 'Gia Lai', 'Hà Giang',
    'Hà Nam', 'Hà Tĩnh', 'Hải Dương', 'Hậu Giang', 'Hòa Bình',
    'Hưng Yên', 'Khánh Hòa', 'Kiên Giang', 'Kon Tum', 'Lai Châu',
    'Lâm Đồng', 'Lạng Sơn', 'Lào Cai', 'Long An', 'Nam Định',
    'Nghệ An', 'Ninh Bình', 'Ninh Thuận', 'Phú Thọ', 'Phú Yên',
    'Quảng Bình', 'Quảng Nam', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị',
    'Sóc Trăng', 'Sơn La', 'Tây Ninh', 'Thái Bình', 'Thái Nguyên',
    'Thanh Hóa', 'Thừa Thiên Huế', 'Tiền Giang', 'Trà Vinh', 'Tuyên Quang',
    'Vĩnh Long', 'Vĩnh Phúc', 'Yên Bái'
];

// Match backend SortOption enum (Vietnamese labels are the values)
const SORT_OPTIONS = [
    { value: 'Đánh giá cao nhất', label: 'Đánh giá từ cao tới thấp' },
    { value: 'Đánh giá thấp nhất', label: 'Đánh giá từ thấp tới cao' },
    { value: 'Tên A-Z', label: 'Tên A-Z' },
    { value: 'Tên Z-A', label: 'Tên Z-A' }
];

const Destinations = () => {
    const [destinations, setDestinations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [sortBy, setSortBy] = useState('Đánh giá cao nhất');

    // Search query (vibe)
    const [searchQuery, setSearchQuery] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [isSearchMode, setIsSearchMode] = useState(false);

    // Multi-select filters (arrays) + province dropdown
    const [filters, setFilters] = useState({
        budget_range: [],
        available_time: [],
        companion_tag: [],
        season_tag: []
    });
    const [selectedProvince, setSelectedProvince] = useState('');

    useEffect(() => {
        if (isSearchMode && searchQuery) {
            performSearch();
        } else {
            fetchDestinations();
        }
    }, [page, filters, selectedProvince, searchQuery, isSearchMode, sortBy]);

    // Normal filter-based fetch
    const fetchDestinations = async () => {
        setLoading(true);
        try {
            // Build filters
            const activeFilters = {};

            // All filters: send full arrays for backend $in operator
            if (filters.budget_range.length > 0) {
                activeFilters.budget_range = filters.budget_range;
            }
            // Arrays: send full arrays for backend $in operator
            if (filters.available_time.length > 0) {
                activeFilters.available_time = filters.available_time;
            }
            if (filters.companion_tag.length > 0) {
                activeFilters.companion_tag = filters.companion_tag;
            }
            if (filters.season_tag.length > 0) {
                activeFilters.season_tag = filters.season_tag;
            }

            // Province: single string
            if (selectedProvince) {
                activeFilters.location_province = selectedProvince;
            }

            const data = await getDestinations(activeFilters, page, 24, sortBy);
            setDestinations(data.data || []);
            setTotalPages(data.total_pages || 1);
            setTotalResults(data.total || 0);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Semantic search with filters (no LLM)
    const performSearch = async () => {
        setLoading(true);
        try {
            const activeFilters = {};
            Object.entries(filters).forEach(([key, values]) => {
                if (values.length > 0) {
                    activeFilters[key] = values[0];
                }
            });

            const data = await semanticSearch(searchQuery, activeFilters);
            console.log('Search Response:', data); // Debug
            setDestinations(data.data || []);
            setTotalPages(1); // Search returns all results
            setTotalResults(data.total_found || 0);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchInput.trim()) {
            setSearchQuery(searchInput.trim());
            setIsSearchMode(true);
            setPage(1);
        }
    };

    const clearSearch = () => {
        setSearchInput('');
        setSearchQuery('');
        setIsSearchMode(false);
        setPage(1);
    };

    // Sort destinations on frontend
    const sortedDestinations = useMemo(() => {
        if (sortBy === 'default') return destinations;

        return [...destinations].sort((a, b) => {
            switch (sortBy) {
                case 'rating_desc':
                    return (b.overall_rating || 0) - (a.overall_rating || 0);
                case 'rating_asc':
                    return (a.overall_rating || 0) - (b.overall_rating || 0);
                case 'name_asc':
                    return (a.name || '').localeCompare(b.name || '', 'vi');
                case 'name_desc':
                    return (b.name || '').localeCompare(a.name || '', 'vi');
                default:
                    return 0;
            }
        });
    }, [destinations, sortBy]);

    const handleCheckboxChange = (key, value) => {
        setFilters(prev => {
            const current = prev[key];
            const updated = current.includes(value)
                ? current.filter(v => v !== value)
                : [...current, value];
            return { ...prev, [key]: updated };
        });
        setPage(1);
    };

    const clearFilters = () => {
        setFilters({
            budget_range: [],
            available_time: [],
            companion_tag: [],
            season_tag: []
        });
        setSelectedProvince('');
        setPage(1);
    };

    const hasActiveFilters = Object.values(filters).some(arr => arr.length > 0) || selectedProvince;

    return (
        <div className="destinations-page">
            <div className="destinations-layout">
                {/* Sidebar Filters */}
                <aside className="filter-sidebar">
                    {/* Search Input */}
                    <div className="search-section">
                        <h3>Tìm kiếm</h3>
                        <form onSubmit={handleSearch} className="search-form">
                            <input
                                type="text"
                                className="input search-input"
                                placeholder="VD: biển đẹp, núi mát mẻ..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                            />
                            <button type="submit" className="btn btn-primary search-btn">
                                Tìm
                            </button>
                        </form>
                        {isSearchMode && (
                            <div className="search-active">
                                <span>Đang tìm: "{searchQuery}"</span>
                                <button className="clear-search" onClick={clearSearch}>✕</button>
                            </div>
                        )}
                    </div>

                    <div className="sidebar-divider"></div>

                    <div className="sidebar-header">
                        <h3>Bộ lọc</h3>
                        {hasActiveFilters && (
                            <button className="clear-btn" onClick={clearFilters}>
                                Xóa tất cả
                            </button>
                        )}
                    </div>

                    {/* Province Dropdown */}
                    <div className="filter-section">
                        <h4>Tỉnh / Thành phố</h4>
                        <select
                            className="input select province-select"
                            value={selectedProvince}
                            onChange={(e) => { setSelectedProvince(e.target.value); setPage(1); }}
                        >
                            <option value="">Tất cả tỉnh thành</option>
                            {PROVINCES.map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>

                    {/* Budget */}
                    <div className="filter-section">
                        <h4>Ngân sách</h4>
                        <div className="checkbox-list">
                            {FILTER_OPTIONS.budget_range.map(opt => (
                                <label key={opt.value} className="checkbox-item">
                                    <input
                                        type="checkbox"
                                        checked={filters.budget_range.includes(opt.value)}
                                        onChange={() => handleCheckboxChange('budget_range', opt.value)}
                                    />
                                    <span>{opt.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Time */}
                    <div className="filter-section">
                        <h4>Thời gian</h4>
                        <div className="checkbox-list">
                            {FILTER_OPTIONS.available_time.map(opt => (
                                <label key={opt.value} className="checkbox-item">
                                    <input
                                        type="checkbox"
                                        checked={filters.available_time.includes(opt.value)}
                                        onChange={() => handleCheckboxChange('available_time', opt.value)}
                                    />
                                    <span>{opt.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Companion */}
                    <div className="filter-section">
                        <h4>Đi cùng</h4>
                        <div className="checkbox-list">
                            {FILTER_OPTIONS.companion_tag.map(opt => (
                                <label key={opt.value} className="checkbox-item">
                                    <input
                                        type="checkbox"
                                        checked={filters.companion_tag.includes(opt.value)}
                                        onChange={() => handleCheckboxChange('companion_tag', opt.value)}
                                    />
                                    <span>{opt.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Season */}
                    <div className="filter-section">
                        <h4>Mùa</h4>
                        <div className="checkbox-list">
                            {FILTER_OPTIONS.season_tag.map(opt => (
                                <label key={opt.value} className="checkbox-item">
                                    <input
                                        type="checkbox"
                                        checked={filters.season_tag.includes(opt.value)}
                                        onChange={() => handleCheckboxChange('season_tag', opt.value)}
                                    />
                                    <span>{opt.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="destinations-main">
                    {/* Results Header */}
                    <div className="results-header">
                        <div className="results-count">
                            {isSearchMode ? (
                                <>Tìm thấy: <strong>{totalResults}</strong> kết quả</>
                            ) : (
                                <>Tổng số: <strong>{totalResults}</strong> địa điểm</>
                            )}
                        </div>
                        <div className="sort-control">
                            <label>Sắp xếp:</label>
                            <select
                                className="input select"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                {SORT_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Error */}
                    {error && <div className="error-msg">{error}</div>}

                    {/* Loading */}
                    {loading ? (
                        <div className="loading-container">
                            <LoadingSpinner />
                        </div>
                    ) : (
                        <>
                            {/* Grid */}
                            {sortedDestinations.length > 0 ? (
                                <div className="destinations-grid">
                                    {sortedDestinations.map(dest => (
                                        <Link
                                            to={`/destinations/${dest.id}`}
                                            key={dest.id}
                                            className="destination-card"
                                        >
                                            <div className="card-image">
                                                <img
                                                    src={dest.image_urls?.[0] || 'https://via.placeholder.com/400x300?text=No+Image'}
                                                    alt={dest.name}
                                                    onError={(e) => {
                                                        e.target.src = 'https://via.placeholder.com/400x300?text=No+Image';
                                                    }}
                                                />
                                                {dest.overall_rating > 0 && (
                                                    <div className="card-rating-badge">
                                                        <span className="star">⭐</span>
                                                        <span className="rating-value">{dest.overall_rating.toFixed(1)}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="card-content">
                                                <h3>{dest.name}</h3>
                                                <p className="card-location">📍 {dest.location_province}</p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <p>Không tìm thấy địa điểm nào</p>
                                    {(hasActiveFilters || isSearchMode) && (
                                        <button className="btn btn-secondary" onClick={() => { clearFilters(); clearSearch(); }}>
                                            Xóa bộ lọc & tìm kiếm
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Pagination - only show when not in search mode */}
                            {!isSearchMode && totalPages > 1 && (
                                <div className="pagination">
                                    <div className="pagination-buttons">
                                        <button
                                            className="btn btn-secondary btn-icon"
                                            disabled={page <= 1}
                                            onClick={() => setPage(1)}
                                            title="Trang đầu"
                                        >
                                            ««
                                        </button>
                                        <button
                                            className="btn btn-secondary btn-icon"
                                            disabled={page <= 1}
                                            onClick={() => setPage(p => p - 1)}
                                            title="Trang trước"
                                        >
                                            «
                                        </button>
                                    </div>

                                    <div className="page-input-group">
                                        <span>Trang</span>
                                        <input
                                            type="number"
                                            className="input page-input"
                                            value={page}
                                            min={1}
                                            max={totalPages}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                if (val >= 1 && val <= totalPages) {
                                                    setPage(val);
                                                }
                                            }}
                                        />
                                        <span>/ {totalPages}</span>
                                    </div>

                                    <div className="pagination-buttons">
                                        <button
                                            className="btn btn-secondary btn-icon"
                                            disabled={page >= totalPages}
                                            onClick={() => setPage(p => p + 1)}
                                            title="Trang sau"
                                        >
                                            »
                                        </button>
                                        <button
                                            className="btn btn-secondary btn-icon"
                                            disabled={page >= totalPages}
                                            onClick={() => setPage(totalPages)}
                                            title="Trang cuối"
                                        >
                                            »»
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div >
        </div >
    );
};

export default Destinations;
