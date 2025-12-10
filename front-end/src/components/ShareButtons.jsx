import './ShareButtons.css';

const ShareButtons = ({ title, text, url, imageUrl }) => {
    const shareUrl = url || window.location.href;
    const shareText = text || title || 'Check this out!';

    // Facebook Share
    const shareFacebook = () => {
        const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
        window.open(fbUrl, '_blank', 'width=600,height=400');
    };

    // Zalo Share (Using Zalo Share API)
    const shareZalo = () => {
        const zaloUrl = `https://zalo.me/share?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`;
        window.open(zaloUrl, '_blank', 'width=600,height=400');
    };

    // Instagram - Copy link (Instagram doesn't support direct share via URL)
    const shareInstagram = () => {
        // Copy text and URL to clipboard for Instagram
        const copyText = `${shareText}\n\n${shareUrl}`;
        navigator.clipboard.writeText(copyText).then(() => {
            alert('Đã copy nội dung! Mở Instagram và dán vào story hoặc bài viết.');
        }).catch(() => {
            alert('Không thể copy. Vui lòng copy thủ công.');
        });
    };

    // Native Share (for mobile)
    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: title || 'Smart Tourism',
                    text: shareText,
                    url: shareUrl,
                });
            } catch (err) {
                console.log('Share cancelled');
            }
        }
    };

    return (
        <div className="share-buttons">
            <span className="share-label">Chia sẻ:</span>

            <button
                className="share-btn facebook"
                onClick={shareFacebook}
                title="Chia sẻ lên Facebook"
            >
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span>Facebook</span>
            </button>

            <button
                className="share-btn zalo"
                onClick={shareZalo}
                title="Chia sẻ qua Zalo"
            >
                <svg viewBox="0 0 48 48" fill="currentColor">
                    <path d="M24 0C10.745 0 0 10.745 0 24s10.745 24 24 24 24-10.745 24-24S37.255 0 24 0zm8.32 15.36h-3.84c-.32 0-.64.32-.64.64v3.52h4.48l-.64 4.16h-3.84v11.84h-4.48V23.68h-2.88v-4.16h2.88v-4.16c0-2.88 1.92-5.44 5.44-5.44h3.52v5.44zm-14.08 5.76h5.76v11.84h-5.76v-11.84zm2.88-7.04c1.28 0 2.24.96 2.24 2.24s-.96 2.24-2.24 2.24-2.24-.96-2.24-2.24.96-2.24 2.24-2.24z" />
                </svg>
                <span>Zalo</span>
            </button>

            <button
                className="share-btn instagram"
                onClick={shareInstagram}
                title="Copy để chia sẻ lên Instagram"
            >
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
                <span>Instagram</span>
            </button>

            {/* Native share button for mobile */}
            {navigator.share && (
                <button
                    className="share-btn native"
                    onClick={handleNativeShare}
                    title="Chia sẻ"
                >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" />
                    </svg>
                    <span>Khác</span>
                </button>
            )}
        </div>
    );
};

export default ShareButtons;
