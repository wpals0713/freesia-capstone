import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import axios from 'axios';
import './LoginPage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { setAuth, clearAuth } = useAuthStore();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // 입력값 앞뒤 공백 제거 (trim)
            const trimmedUsername = username.trim();
            const trimmedPassword = password.trim();

            // username 입력값을 email 로 매핑하여 API 요청
            const response = await axios.post(`${API_BASE_URL}/api/members/login`, {
                email: trimmedUsername,
                password: trimmedPassword
            });

            const { accessToken, tokenType, expiresIn } = response.data.data;

            // JWT 토큰 저장
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('tokenType', tokenType);
            localStorage.setItem('expiresIn', expiresIn.toString());

            // 사용자 정보 조회 후 Zustand store 에 저장
            try {
                const meResponse = await axios.get(`${API_BASE_URL}/api/members/me`, {
                    headers: {
                        Authorization: `${tokenType} ${accessToken}`
                    }
                });
                const user = meResponse.data.data;
                setAuth(user, accessToken);
            } catch (err) {
                console.error('사용자 정보 조회 실패:', err);
                // 사용자 정보 조회 실패 시에도 로그인은 성공으로 처리
                setAuth({ id: 0, email: username, nickname: '' }, accessToken);
            }

            // 메인 페이지로 이동
            navigate('/');
        } catch (err: any) {
            if (err.response) {
                // 백엔드에서 응답이 왔을 때 (인증 실패 등)
                setError(err.response.data.message || '로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.');
            } else if (err.request) {
                // 요청은 보냈는데 응답이 없을 때 (CORS, 서버 다운 등)
                setError('서버와 연결할 수 없습니다. 네트워크 연결을 확인해주세요.');
            } else {
                // 기타 에러
                setError('로그인 중 오류가 발생했습니다.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignupClick = (e: React.MouseEvent) => {
        e.preventDefault();
        alert('회원가입이 완료되었습니다! 로그인을 진행해 주세요.');
    };

    const handleFindAccountClick = (e: React.MouseEvent) => {
        e.preventDefault();
        alert('임시 비밀번호가 전송되었습니다.');
    };

    const handleKakaoLogin = () => {
        alert('간편 로그인 기능은 준비 중입니다.');
    };

    const handleGoogleLogin = () => {
        alert('간편 로그인 기능은 준비 중입니다.');
    };

    // 로그아웃 처리 (확인 팝업 추가 - 순서 엄수)
    const handleLogout = () => {
        const confirmed = window.confirm('로그아웃 하시겠습니까?');
        if (confirmed) {
            // 1. 먼저 알림창 표시 (동기적으로)
            window.alert('로그아웃 되었습니다.');
            
            // 2. 알림창이 닫힌 후 토큰 삭제
            localStorage.removeItem('accessToken');
            localStorage.removeItem('tokenType');
            localStorage.removeItem('expiresIn');
            clearAuth();
            
            // 3. 페이지 이동
            navigate('/');
        }
    };

    return (
        <div className="login-page-root">
            <div className="login-container">
                <div className="logo-section" style={styles.logoSection}>
                    <div className="brand-icon" aria-hidden="true" style={styles.brandIcon}>
                        <svg viewBox="0 0 64 64" fill="none" style={styles.svg}>
                            <defs>
                                <radialGradient id="petalGradient" cx="0.4" cy="0.3" r="0.9">
                                    <stop offset="0%" stopColor="#FFF9E6" />
                                    <stop offset="40%" stopColor="#FFD700" />
                                    <stop offset="100%" stopColor="#FFB347" />
                                </radialGradient>
                                <radialGradient id="commaPetalGradient" cx="0.4" cy="0.3" r="0.9">
                                    <stop offset="0%" stopColor="#FFE89A" />
                                    <stop offset="40%" stopColor="#FFD700" />
                                    <stop offset="100%" stopColor="#FF9F40" />
                                </radialGradient>
                                <radialGradient id="centerGradient" cx="0.5" cy="0.5" r="0.6">
                                    <stop offset="0%" stopColor="#FFEB8F" />
                                    <stop offset="60%" stopColor="#FFB347" />
                                    <stop offset="100%" stopColor="#FF9933" />
                                </radialGradient>
                            </defs>
                            <circle cx="32" cy="32" r="26" fill="rgba(255,252,240,0.7)" />
                            <ellipse cx="32" cy="18" rx="7" ry="11" fill="url(#petalGradient)" stroke="#FFB347" strokeWidth="0.5" opacity="0.95" />
                            <ellipse cx="32" cy="18" rx="7" ry="11" fill="url(#petalGradient)" stroke="#FFB347" strokeWidth="0.5" opacity="0.95" transform="rotate(60 32 32)" />
                            <ellipse cx="32" cy="18" rx="7" ry="11" fill="url(#petalGradient)" stroke="#FFB347" strokeWidth="0.5" opacity="0.95" transform="rotate(120 32 32)" />
                            <g transform="rotate(165 32 32)">
                                <ellipse cx="32" cy="20" rx="7.5" ry="9" fill="url(#commaPetalGradient)" stroke="#FF9F40" strokeWidth="0.8" opacity="1" />
                                <path d="M32 29 Q30 33, 28 37 Q27 39, 29 40 Q31 39, 32 36 Q33 33, 32 29 Z" fill="url(#commaPetalGradient)" stroke="#FF9F40" strokeWidth="0.8" opacity="1" />
                                <ellipse cx="32" cy="22" rx="3" ry="4" fill="rgba(255,250,220,0.7)" opacity="0.8" />
                            </g>
                            <ellipse cx="32" cy="18" rx="7" ry="11" fill="url(#petalGradient)" stroke="#FFB347" strokeWidth="0.5" opacity="0.95" transform="rotate(240 32 32)" />
                            <ellipse cx="32" cy="18" rx="7" ry="11" fill="url(#petalGradient)" stroke="#FFB347" strokeWidth="0.5" opacity="0.95" transform="rotate(300 32 32)" />
                            <circle cx="32" cy="32" r="6" fill="url(#centerGradient)" stroke="#FF9933" strokeWidth="0.5" />
                            <circle cx="30" cy="30" r="1" fill="#FFFACD" opacity="0.9" />
                            <circle cx="34" cy="30" r="1" fill="#FFFACD" opacity="0.9" />
                            <circle cx="32" cy="33" r="1" fill="#FFFACD" opacity="0.9" />
                            <circle cx="30" cy="33" r="0.8" fill="#FFFACD" opacity="0.8" />
                            <circle cx="34" cy="33" r="0.8" fill="#FFFACD" opacity="0.8" />
                            <circle cx="32" cy="31" r="2.5" fill="rgba(255,255,240,0.5)" />
                        </svg>
                    </div>
                    <div className="brand-name" style={styles.brandName}>프리지아</div>
                    <div className="brand-subtitle" style={styles.brandSubtitle}>감성일기 분석 다이어리</div>
                </div>

                <p className="welcome-text" style={styles.welcomeText}>
                    당신의 오늘의 감정을 기록해보세요 🌼
                </p>

                <form id="loginForm" onSubmit={handleLogin}>
                    <div className="form-group" style={styles.formGroup}>
                        <label htmlFor="username" className="form-label" style={styles.formLabel}>아이디</label>
                        <input
                            type="text"
                            id="username"
                            className="form-input"
                            placeholder="아이디를 입력하세요"
                            autoComplete="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            style={styles.formInput}
                        />
                    </div>

                    <div className="form-group" style={styles.formGroup}>
                        <label htmlFor="password" className="form-label" style={styles.formLabel}>비밀번호</label>
                        <input
                            type="password"
                            id="password"
                            className="form-input"
                            placeholder="비밀번호를 입력하세요"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={styles.formInput}
                        />
                    </div>

                    {error && (
                        <div style={styles.errorText} role="alert">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="login-button"
                        style={{ ...styles.loginButton, opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
                        disabled={isLoading}
                    >
                        {isLoading ? '로그인 중...' : '로그인'}
                    </button>
                </form>

                <div className="sns-divider" style={styles.snsDivider}>
                    <div className="sns-divider-text" style={styles.snsDividerText}>SNS 계정으로 시작하기</div>
                </div>

                <div className="sns-login-buttons" style={styles.snsLoginButtons}>
                    <button
                        type="button"
                        className="sns-button kakao-button"
                        onClick={handleKakaoLogin}
                        style={styles.kakaoButton}
                    >
                        💬 카카오 로그인
                    </button>
                    <button
                        type="button"
                        className="sns-button google-button"
                        onClick={handleGoogleLogin}
                        style={styles.googleButton}
                    >
                        🌐 구글 로그인
                    </button>
                </div>

                <div className="auth-links" style={styles.authLinks}>
                    <a href="#" onClick={handleSignupClick} style={styles.authLink}>회원가입</a>
                    <span className="separator" style={styles.separator}>|</span>
                    <a href="#" onClick={handleFindAccountClick} style={styles.authLink}>아이디/비밀번호 찾기</a>
                </div>

                <p className="footer-text" style={styles.footerText}>
                    프리지아와 함께 감정을 기록하고<br />
                    당신의 마음을 돌아보세요
                </p>
            </div>
        </div>
    );
}

// CSS 스타일 (기존 디자인 100% 유지)
const styles: Record<string, React.CSSProperties> = {
    logoSection: {
        textAlign: 'center',
        marginBottom: '36px',
    },
    brandIcon: {
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: 'radial-gradient(circle at 40% 35%, #fffefb 0%, #fff4dc 80%)',
        boxShadow: '0 8px 20px rgba(255, 214, 150, 0.4)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '16px',
        position: 'relative',
        overflow: 'hidden',
    },
    svg: {
        width: '64px',
        height: '64px',
    },
    brandName: {
        fontSize: '32px',
        fontWeight: 800,
        color: '#a24a00',
        letterSpacing: '3px',
        marginBottom: '8px',
    },
    brandSubtitle: {
        fontSize: '14px',
        fontWeight: 600,
        color: '#c0722d',
    },
    welcomeText: {
        textAlign: 'center',
        color: '#7a5335',
        fontSize: '15px',
        marginBottom: '32px',
        lineHeight: 1.6,
    },
    formGroup: {
        marginBottom: '20px',
    },
    formLabel: {
        display: 'block',
        fontSize: '14px',
        fontWeight: 600,
        color: '#7a5335',
        marginBottom: '8px',
    },
    formInput: {
        width: '100%',
        padding: '14px 18px',
        border: '2px solid rgba(255, 196, 130, 0.6)',
        borderRadius: '12px',
        fontSize: '15px',
        outline: 'none',
        transition: 'all 0.3s',
        background: 'rgba(255, 255, 255, 0.9)',
        color: '#5c3b1e',
    },
    loginButton: {
        width: '100%',
        padding: '16px',
        background: 'linear-gradient(135deg, #fff4d1 0%, #ffbe8f 100%)',
        color: '#6b2b00',
        border: '2px solid #ffc18c',
        borderRadius: '12px',
        fontSize: '16px',
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all 0.3s',
        marginTop: '28px',
        boxShadow: '0 6px 18px rgba(255, 193, 121, 0.35)',
    },
    snsDivider: {
        display: 'flex',
        alignItems: 'center',
        textAlign: 'center',
        margin: '28px 0 20px 0',
    },
    snsDividerText: {
        padding: '0 16px',
        fontSize: '13px',
        color: '#a0826a',
        fontWeight: 500,
    },
    snsLoginButtons: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '24px',
    },
    kakaoButton: {
        width: '100%',
        padding: '14px',
        borderRadius: '12px',
        fontSize: '15px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.3s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        border: 'none',
        background: '#FEE500',
        color: '#3c1e1e',
        boxShadow: '0 4px 12px rgba(254, 229, 0, 0.3)',
    },
    googleButton: {
        width: '100%',
        padding: '14px',
        borderRadius: '12px',
        fontSize: '15px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.3s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        border: 'none',
        background: 'white',
        color: '#333',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    },
    authLinks: {
        textAlign: 'center',
        marginTop: 0,
        fontSize: '13px',
        color: '#8b6f5c',
    },
    authLink: {
        color: '#b15a19',
        textDecoration: 'none',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'color 0.2s',
    },
    separator: {
        margin: '0 8px',
        color: '#c9a78c',
        fontWeight: 300,
    },
    footerText: {
        textAlign: 'center',
        marginTop: '24px',
        fontSize: '13px',
        color: '#a0826a',
    },
    errorText: {
        color: '#d32f2f',
        fontSize: '14px',
        marginBottom: '12px',
        textAlign: 'center',
    },
};

export default LoginPage;