import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import './Login.css';

// Google Client ID from environment or placeholder
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Facebook SDK initialization
const initFacebookSDK = () => {
    return new Promise((resolve) => {
        // Load Facebook SDK
        window.fbAsyncInit = function () {
            window.FB.init({
                appId: import.meta.env.VITE_FACEBOOK_APP_ID || '',
                cookie: true,
                xfbml: true,
                version: 'v18.0'
            });
            resolve(window.FB);
        };

        // Load SDK script
        if (!document.getElementById('facebook-jssdk')) {
            const script = document.createElement('script');
            script.id = 'facebook-jssdk';
            script.src = 'https://connect.facebook.net/vi_VN/sdk.js';
            script.async = true;
            script.defer = true;
            document.body.appendChild(script);
        } else if (window.FB) {
            resolve(window.FB);
        }
    });
};

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, loginWithGoogle, loginWithFacebook, loading, error, clearError } = useAuth();

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        rememberMe: false
    });
    const [formError, setFormError] = useState('');
    const [fbReady, setFbReady] = useState(false);

    const from = location.state?.from?.pathname || '/';

    // Initialize Facebook SDK
    useEffect(() => {
        if (import.meta.env.VITE_FACEBOOK_APP_ID) {
            initFacebookSDK().then(() => setFbReady(true));
        }
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        setFormError('');
        clearError();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');

        if (!formData.username.trim()) {
            setFormError('Vui lòng nhập tên đăng nhập');
            return;
        }
        if (!formData.password) {
            setFormError('Vui lòng nhập mật khẩu');
            return;
        }

        const result = await login(formData.username, formData.password, formData.rememberMe);
        if (result.success) {
            navigate(from, { replace: true });
        }
    };

    // Google Login Success
    const handleGoogleSuccess = async (credentialResponse) => {
        const result = await loginWithGoogle(credentialResponse.credential);
        if (result.success) {
            navigate(from, { replace: true });
        }
    };

    // Google Login Error
    const handleGoogleError = () => {
        setFormError('Đăng nhập Google thất bại. Vui lòng thử lại.');
    };

    // Facebook Login
    const handleFacebookLogin = () => {
        if (!window.FB) {
            setFormError('Facebook SDK chưa sẵn sàng. Vui lòng thử lại.');
            return;
        }

        window.FB.login(async (response) => {
            if (response.authResponse) {
                const result = await loginWithFacebook(response.authResponse.accessToken);
                if (result.success) {
                    navigate(from, { replace: true });
                }
            } else {
                setFormError('Đăng nhập Facebook bị hủy.');
            }
        }, { scope: 'email,public_profile' });
    };

    const hasGoogleId = !!GOOGLE_CLIENT_ID;
    const hasFacebookId = !!import.meta.env.VITE_FACEBOOK_APP_ID;

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <h1>Đăng nhập</h1>
                    <p>Chào mừng bạn quay lại</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {(formError || error) && (
                        <div className="form-error">
                            {formError || error}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="username">Tên đăng nhập</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            className="input"
                            value={formData.username}
                            onChange={handleChange}
                            placeholder="Nhập tên đăng nhập"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Mật khẩu</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            className="input"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Nhập mật khẩu"
                        />
                    </div>

                    <div className="form-row">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                name="rememberMe"
                                checked={formData.rememberMe}
                                onChange={handleChange}
                            />
                            Ghi nhớ đăng nhập
                        </label>
                        <Link to="/forgot-password" className="forgot-link">
                            Quên mật khẩu?
                        </Link>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg btn-submit"
                        disabled={loading}
                    >
                        {loading ? 'Đang xử lý...' : 'Đăng nhập'}
                    </button>
                </form>

                {/* OAuth Section */}
                {(hasGoogleId || hasFacebookId) && (
                    <>
                        <div className="auth-divider">
                            <span>hoặc</span>
                        </div>

                        <div className="social-buttons">
                            {/* Google Login */}
                            {hasGoogleId && (
                                <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                                    <GoogleLogin
                                        onSuccess={handleGoogleSuccess}
                                        onError={handleGoogleError}
                                        theme="outline"
                                        size="large"
                                        width="100%"
                                        text="signin_with"
                                        shape="rectangular"
                                    />
                                </GoogleOAuthProvider>
                            )}

                            {/* Facebook Login */}
                            {hasFacebookId && (
                                <button
                                    type="button"
                                    className="btn-social btn-facebook"
                                    onClick={handleFacebookLogin}
                                    disabled={!fbReady || loading}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                    </svg>
                                    Tiếp tục với Facebook
                                </button>
                            )}
                        </div>
                    </>
                )}

                {/* No OAuth configured message */}
                {!hasGoogleId && !hasFacebookId && (
                    <div className="oauth-notice">
                        <p>Đăng nhập bằng Google/Facebook chưa được cấu hình.</p>
                    </div>
                )}

                <div className="auth-footer">
                    <p>
                        Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
