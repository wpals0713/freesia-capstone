import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './MainPage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const AI_SERVER_URL = import.meta.env.VITE_AI_SERVER_URL || 'http://localhost:5000';

interface Message {
    id: number;
    text: string;
    sender: 'user' | 'bot';
    isRecommendationButton?: boolean;
    emotion?: string;
}

interface DiaryEntry {
    id?: number;
    text: string;
    emotion: string;
    date: string;
}

interface Inquiry {
    title: string;
    content: string;
    date: string;
}

interface DiaryStatistics {
    totalDiaries: number;
    emotionDistribution: {
        emotion: string;
        count: number;
    }[];
    averageScore: number;
}

interface CalendarDayData {
    date: string;
    emotion: string;
}

// 웰컴 메시지 데이터
const WELCOME_MESSAGES = [
    {
        title: "안녕하세요, 친구님! 👋",
        message: "많이 힘드셨죠? 오늘은 아무 생각 말고 이곳에 당신의 하루를 털어놓아 보세요. 프리지아가 당신의 이야기를 들어드릴게요."
    },
    {
        title: "프리지아의 꽃말 🌼",
        message: "당신의 새로운 시작을 응원합니다. 무거운 마음은 여기에 내려두고, 용기 있는 시작을 함께해요."
    },
    {
        title: "오늘의 위로 💛",
        message: "당신의 감정은 모두 소중해요. 슬픔도, 기쁨도, 분노도 모두 당신의 일부입니다. 편하게 이야기해주세요."
    },
    {
        title: "기록의 시작 ✨",
        message: "매일의 작은 기록이 큰 변화를 만듭니다. 오늘부터 프리지아와 함께 감성 일기를 시작해보세요!"
    }
];

// 추천 콘텐츠 팝업 데이터 타입
interface RecommendationPopupData {
    song: { title: string; lyrics: string };
    poem: { title: string; lyrics: string };
}

// 추천 콘텐츠 팝업 데이터
const RECOMMENDATION_POPUP_DATA: Record<string, RecommendationPopupData> = {
    '슬픔': {
        song: { title: '잔잔한 위로', lyrics: '흐르는 눈물을 닦아주며 / 당신의 곁에 있을게요 / 아픔은 지나가고 / 다시 웃을 날이 오니까요' },
        poem: { title: '오늘의 위로', lyrics: '당신의 가치는 흔들리지 않아요 / 오늘도 충분히 잘했어요 / 내일은 더 좋은 날이 오니까' }
    },
    '분노': {
        song: { title: '에너지 방출', lyrics: '힘차게 뿜어내요 / 모든 화를 날려버려요 / 당신은 강해요 / 다시 일어설 수 있어요' },
        poem: { title: '힘내라', lyrics: '분노는 당신의 힘이에요 / 올바르게 사용하세요 / 경계를 설정하고 / 자신을 지키세요' }
    },
    '기쁨': {
        song: { title: '행복한 하루', lyrics: '오늘은 좋은 날이에요 / 모든 것이 잘돼가요 / 미소 짓는 당신을 / 바라보는 것만으로도' },
        poem: { title: '감사함', lyrics: '작은 것들에 감사해요 / 주변의 아름다움을 / 느껴보세요 지금 / 행복은 가까이 있어요' }
    },
    '즐거움': {
        song: { title: '기분 좋은 날', lyrics: '노래를 부르며 춤을춰요 / 즐거운 이 순간을 / 친구들과 함께해요 / 기억에 남을 날로' },
        poem: { title: '즐거움', lyrics: '웃음은 전염돼요 / 당신의 기쁨이 / 주변에 퍼져가요 / 함께 나누면 배가 돼요' }
    },
    '중립': {
        song: { title: '차분한 하루', lyrics: '조용한 시간을 보내며 / 마음을 정리해요 / 내면을 들여다보고 / 평화를 찾아가요' },
        poem: { title: '평온함', lyrics: '조용한 물결처럼 / 흐르는 시간을 / 느껴보세요 지금 / 마음의 평화를' }
    }
};

// 감정별 리액션 응답
const EMOTION_REACTIONS: Record<string, string[]> = {
    '기쁨': [
        '기쁨을 느끼고 계시는군요! 🌟 그 기분을 오래 간직할 수 있도록 함께 노력해봐요!',
        '행복한 하루가 되셨다니 저도 기쁩니다! 😊 더 많은 기쁨을 만나길 바라요!',
        '기쁜 마음이 전해지네요! ✨ 이런 긍정적인 감정이 하루를 밝게 만들어요!'
    ],
    '슬픔': [
        '슬픔을 느끼고 계시는군요. 😢 감정은 자연스러운 것이에요. 그 감정을 인정하고 함께 이겨내요.',
        '슬픈 감정을 기록하셨네요. 💙 때로는 슬픔도 성장의 일부예요. 말씀해 주시면 듣겠습니다.',
        '지금 마음이 무겁으신가요? 😢 건강한 감정 표현이 중요합니다. 함께 해요!'
    ],
    '분노': [
        '분노를 느끼고 계시는군요. 😡 그 감정을 표현해주셔서 고마워요. 심호흡을 하며 차분하게 생각해봐요.',
        '분노는 자연스러운 감정입니다. 👊 그 감정을 건설적인 방법으로 해소해봐요.',
        '지금 화가 많이 나셨군요. 😤 그 감정을 인정하고, 왜 화가 났는지 생각해보세요.'
    ],
    '즐거움': [
        '즐거움을 느끼고 계시네요! 🎉 그런 긍정적인 에너지가 저에게도 전달돼요!',
        '즐거운 하루 되세요! 🌈 이런 멋진 감정은 계속 유지하세요!',
        '즐거운 마음을 함께 나눠주셔서 감사해요! 🎊 더 많은 즐거운 순간을 만나길 바라요!'
    ]
};

// 추천 콘텐츠 데이터
const RECOMMENDATIONS: Record<string, any[]> = {
    '슬픔': [
        { tag: '노래 추천 🎵', title: '잔잔한 위로 플레이리스트', desc: '차분한 어쿠스틱과 재즈로 마음의 물결을 가라앉혀요.', url: 'https://www.youtube.com/results?search_query=%EC%9C%84%EB%A1%9C+%EC%9E%90%EB%8A%94+%EC%9E%90%EC%9E%90%ED%95%9C+%ED%94%8C%EB%A0%88%EC%9D%B4%EB%A6%AC%EC%8A%A4%ED%8A%B8' },
        { tag: '글귀 추천 ✍️', title: '오늘의 위로 문장', desc: '"당신의 가치는 흔들리지 않아요. 오늘도 충분히 잘했어요."', url: 'https://www.google.com/search?q=%EC%9C%84%EB%A1%9C+%EB%AC%B8%EA%B5%AC' },
        { tag: '호흡 가이드 🧘', title: '4-7-8 호흡법', desc: '4 초 들숨, 7 초 멈춤, 8 초 날숨을 4 회 반복하면 긴장이 완화돼요.', url: 'https://www.google.com/search?q=4-7-8+%ED%98%B8%ED%9E%88%EA%B8%88' }
    ],
    '분노': [
        { tag: '운동 추천 🏃', title: '5 분 체력 회복 루틴', desc: '짧고 안전한 전신 루틴으로 화의 에너지를 건강하게 분출해요.', url: 'https://www.youtube.com/results?search_query=5%EB%B6%84+%ED%9A%8C%EB%B3%B5+%EB%A3%A8%ED%8B%B4' },
        { tag: '글쓰기 📝', title: '감정 명료화 프롬프트', desc: '"정확히 무엇이 불공정했나요?" "바라는 경계는 무엇인가요?"', url: 'https://www.google.com/search?q=%EA%B0%90%EC%A0%95+%EA%B8%80%EC%93%B0%EA%B8%B0+%ED%94%84%EB%A1%AC%ED%94%84%ED%8A%B8' },
        { tag: '음악 🎧', title: '에너지 배출 트랙', desc: '빠른 템포 음악으로 순한 배출을 돕는 셋리스트.', url: 'https://www.youtube.com/results?search_query=%ED%85%9C%ED%8F%AC+%EB%B9%A0%EB%A5%B8+%EC%9D%8C%EC%95%85' }
    ],
    '기쁨': [
        { tag: '기록 📔', title: '감사 3 가지', desc: '지금 고마운 세 가지를 적고, 이유를 곁들여보세요.', url: 'https://www.google.com/search?q=%EA%B0%90%EC%82%AC+%EC%9D%BC%EA%B8%B0' },
        { tag: '공유 💬', title: '작은 기쁨 나누기', desc: '가까운 사람에게 오늘의 하이라이트 한 줄 보내기.', url: 'https://www.google.com/search?q=%EA%B8%B0%EC%81%A8+%EA%B3%B5%EC%9C%A0' },
        { tag: '음악 🎵', title: '밝은 무드 재생목록', desc: '상승 기분을 살짝 더 끌어올리는 팝/시티팝.', url: 'https://www.youtube.com/results?search_query=%EB%B0%9D%EC%9D%80+%EB%AC%B4%EB%93%9C+%EC%9E%AC%EC%83%9D%EB%AA%A9%EB%A1%9D' },
        { tag: '글귀 추천 ✍️', title: '오늘의 긍정 한 줄', desc: '"작은 기쁨을 발견하는 눈이 큰 행복을 부른다."', url: 'https://www.google.com/search?q=%EA%B8%8D%EC%A0%95+%EB%AC%B8%EA%B5%AC' }
    ],
    '즐거움': [
        { tag: '확장 🎯', title: '플로우 활동 20 분', desc: '몰입을 느끼는 취미를 짧게라도 시작해요.', url: 'https://www.google.com/search?q=%ED%94%8C%EB%A1%9C%EC%9A%B0+%ED%99%9C%EB%8F%99' },
        { tag: '기록 📷', title: '한 장의 사진', desc: '지금 순간을 사진으로 남기고 한 줄 캡션.', url: 'https://www.google.com/search?q=%ED%95%9C%EC%9E%A5%EC%9D%98+%EC%82%AC%EC%A7%84+%EC%9D%BC%EA%B8%B0' },
        { tag: '음악 🎶', title: '기분 좋은 리듬', desc: '경쾌한 리듬으로 긍정의 여운을 유지해요.', url: 'https://www.youtube.com/results?search_query=%EA%B2%BD%EA%BE%8C%ED%95%9C+%EB%A6%AC%EB%93%AC' },
        { tag: '글귀 추천 ✍️', title: '즐거움 유지 한 줄', desc: '"기쁨은 나누면 배가 된다." 지금 누군가와 공유해요.', url: 'https://www.google.com/search?q=%EA%B8%B0%EB%B6%84+%EA%B8%80%EA%B5%AC' }
    ]
};

// 감정 이모지 매핑
const EMOTION_EMOJI: Record<string, string> = {
    '기쁨': '😊',
    '슬픔': '😢',
    '분노': '😡',
    '즐거움': '😄',
    '중립': '📝'
};

// 공감 이모지 매핑
const EMPATHY_EMOJI: Record<string, string> = {
    '기쁨': '🥰',
    '즐거움': '✨',
    '슬픔': '🥺',
    '분노': '😢',
    '중립': '💙'
};

function MainPage() {
    // 채팅/일기 토글 상태
    const [chatMode, setChatMode] = useState<'chat' | 'diary'>('chat');
    
    // 웰컴 메시지 팝업 상태
    const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
    const [visibleWelcomeIndex, setVisibleWelcomeIndex] = useState(-1);
    const [welcomeAnimationComplete, setWelcomeAnimationComplete] = useState(false);
    
    // 채팅 관련 상태
    const [messages, setMessages] = useState<Message[]>([]);
    const [userInput, setUserInput] = useState('');
    const [typing, setTyping] = useState(false);
    
    // 일기 모드 상태
    const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
    const [diaryStep, setDiaryStep] = useState(0); // 0: 초기, 1: 감정 선택됨, 2: 일기 작성 완료
    const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
    const [hasWrittenToday, setHasWrittenToday] = useState(false);
    
    // 현재 화면
    const [currentView, setCurrentView] = useState<'chat' | 'calendar' | 'graph' | 'recommendations' | 'myInfo'>('chat');
    
    // 캘린더/그래프 상태
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [graphMonth, setGraphMonth] = useState(new Date());
    const [viewingDate, setViewingDate] = useState<string | null>(null);
    const [calendarDayData, setCalendarDayData] = useState<CalendarDayData[]>([]);
    
    // 추천 상태
    const [recommendations, setRecommendations] = useState<any[]>([]);
    
    // 추천 콘텐츠 팝업 상태
    const [isRecommendationPopupOpen, setIsRecommendationPopupOpen] = useState(false);
    const [popupEmotion, setPopupEmotion] = useState<string>('기쁨');
    
    // 문의하기 상태
    const [isInquiryOpen, setIsInquiryOpen] = useState(false);
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [inquiryTitle, setInquiryTitle] = useState('');
    const [inquiryContent, setInquiryContent] = useState('');
    
    // 통계 상태
    const [statistics, setStatistics] = useState<DiaryStatistics | null>(null);
    
    // 설정 팝업 상태
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    
    // 메시지 컨테이너 참조
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatMessagesRef = useRef<HTMLDivElement>(null);
    
    // 웰컴 메시지 애니메이션
    useEffect(() => {
        // 페이지 로드 시 웰컴 메시지 표시
        const welcomeKey = 'freesiaWelcomeShown';
        const hasShownWelcome = sessionStorage.getItem(welcomeKey) === 'true';
        
        if (!hasShownWelcome) {
            const timer = setTimeout(() => {
                setIsWelcomeOpen(true);
                showWelcomeMessage(0);
            }, 500);
            sessionStorage.setItem(welcomeKey, 'true');
            return () => clearTimeout(timer);
        }
    }, []);
    
    // 웰컴 메시지 표시
    const showWelcomeMessage = (index: number) => {
        if (index >= WELCOME_MESSAGES.length) {
            setWelcomeAnimationComplete(true);
            setTimeout(() => {
                setIsWelcomeOpen(false);
                setWelcomeAnimationComplete(false);
            }, 1500);
            return;
        }
        
        setVisibleWelcomeIndex(index);
        
        // 다음 메시지 표시 대기
        setTimeout(() => {
            showWelcomeMessage(index + 1);
        }, 3000);
    };
    
    // 웰컴 메시지 닫기
    const handleCloseWelcome = () => {
        setIsWelcomeOpen(false);
        setVisibleWelcomeIndex(-1);
    };
    
    // 설정 버튼 클릭
    const handleSettingsClick = () => {
        alert('⚙️ 설정 기능이 곧 추가됩니다!\n\n- 알림 설정\n- 개인정보 관리\n- 데이터 백업/복원\n- 앱 버전 정보');
    };
    
    // 초기 메시지 및 데이터 로드
    useEffect(() => {
        if (currentView === 'chat' && messages.length === 0 && !isWelcomeOpen) {
            // 초기 데이터 로드 (일기 목록, 통계)
            loadInitialData();
        }
    }, [currentView, isWelcomeOpen]);
    
    // 스크롤 자동 하단으로
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typing]);
    
    // 일기 모드 시작
    const startDiaryMode = () => {
        setChatMode('diary');
        setDiaryStep(0);
        setSelectedEmotion(null);
        setMessages([]);
        addBotMessage('오늘 하루의 이야기를 들려주세요 🌼');
    };
    
    // 초기 데이터 로드 (일기 목록, 통계)
    const loadInitialData = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                console.log('토큰이 없습니다.');
                return;
            }
            
            // 1. 일기 목록 조회
            const diaryResponse = await axios.get(
                `${API_BASE_URL}/api/diaries`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            // ApiResponse.data 에서 실제 데이터 추출
            const diaries = diaryResponse.data.data || [];
            console.log('📥 초기 일기 데이터 로드:', diaries.length, '편');
            
            // 일기 목록을 메시지 형태로 변환
            const initialMessages: Message[] = diaries.map((diary: any) => ({
                id: diary.id,
                text: diary.content,
                sender: 'user' as const
            }));
            setMessages(initialMessages);
            
            // 캘린더 데이터도 함께 로드
            const dayData: CalendarDayData[] = diaries.map((diary: any) => ({
                date: diary.createdAt ? diary.createdAt.substring(0, 10) : diary.date,
                emotion: diary.emotion || '중립'
            }));
            setCalendarDayData(dayData);
            
            // 2. 통계 데이터 조회 (현재 달 기준)
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1;
            
            try {
                const statsResponse = await axios.get(
                    `${API_BASE_URL}/api/diaries/statistics`,
                    {
                        params: { year, month },
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                setStatistics(statsResponse.data.data);
            } catch (statsError) {
                console.log('통계 데이터 로드 실패 (데이터가 없을 수 있음):', statsError);
            }
            
        } catch (error) {
            console.error('초기 데이터 로드 실패:', error);
        }
    };
    
    // 일기 모드 시작 (텍스트 입력만)
    const startDiaryModeTextInput = () => {
        setChatMode('diary');
        setDiaryStep(0);
        setSelectedEmotion(null);
        setMessages([]);
        addBotMessage('오늘 하루의 이야기를 들려주세요 🌼');
    };
    
    // 일반 채팅 모드로 복귀
    const exitDiaryMode = () => {
        setChatMode('chat');
        setDiaryStep(0);
        setSelectedEmotion(null);
        setMessages([]);
        addBotMessage('안녕하세요! 오늘 하루는 어떠셨나요? 자유롭게 대화해보세요!');
    };
    
    // 감정 버튼 클릭 (일반 채팅 모드에서만 사용)
    const handleEmotionClick = (emotion: string) => {
        if (chatMode === 'chat') {
            // 일반 채팅 모드: 감정 기반 응답
            setTyping(true);
            setTimeout(() => {
                setTyping(false);
                const reaction = getEmotionReaction(emotion);
                addBotMessage(reaction);
            }, 800);
        }
    };
    
    // 메시지 전송
    const handleSendMessage = async () => {
        const message = userInput.trim();
        if (!message) return;
        
        if (chatMode === 'chat') {
            // 일반 채팅 모드
            addUserMessage(message);
            setUserInput('');
            setTyping(true);
            
            setTimeout(() => {
                setTyping(false);
                const botResponse = generateBotResponse(message);
                addBotMessage(botResponse);
            }, 1000);
        } else {
            // 일기 모드: 일기 내용 작성 완료
            setUserInput('');
            
            // 분석 중 메시지 표시
            addBotMessage('감정을 분석 중입니다...');
            
            // 일기 저장 - 텍스트와 JWT 토큰만 사용 (백엔드에서 자동 감정 분석)
            const todayKey = formatDateKey(new Date());
            
            try {
                const token = localStorage.getItem('accessToken');
                
                if (!token) {
                    alert('로그인이 필요합니다. 다시 로그인해주세요.');
                    return;
                }
                
                // 1. 백엔드 API 로 일기 저장
                console.log("📡 [1. Backend Request] Sending to /api/diaries:", { content: message, date: todayKey });
                
                const diaryResponse = await axios.post(
                    `${API_BASE_URL}/api/diaries`,
                    { content: message, date: todayKey },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                
                // 백엔드 응답 확인 (ApiResponse 구조)
                console.log("✅ [2. Backend Response] Received from /api/diaries:", diaryResponse.data);
                
                // ApiResponse.success 확인
                if (!diaryResponse.data.success) {
                    alert(`일기 저장 실패: ${diaryResponse.data.message}`);
                    // 분석 중 메시지 제거
                    setMessages(prev => prev.filter(msg => !msg.text.includes('감정을 분석 중입니다...')));
                    return;
                }
                
                // 백엔드에서 반환한 감정 정보
                const backendEmotion = diaryResponse.data.data.emotion || '중립';
                
                // 2. AI 감정 분석 (POST /api/analyze)
                console.log("🤖 [3. AI Server Request] Sending to /api/analyze:", { text: message });
                
                setTyping(true);
                try {
                    const aiResponse = await axios.post(
                        `${AI_SERVER_URL}/api/analyze`,
                        { text: message },
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                    
                    // AI 서버 응답 로그
                    console.log("✨ [4. AI Server Response] Received from /api/analyze:", aiResponse.data);
                    
                    const { aiComment, emotion } = aiResponse.data;
                    const empathyEmoji = getEmpathyEmoji(backendEmotion);
                    
                    // 분석 중 메시지 제거하고 새로운 결과 추가 (화면 증발 방지)
                    setMessages(prev => {
                        // "감정을 분석 중입니다..." 메시지 제거
                        const filteredMessages = prev.filter(msg => 
                            !msg.text.includes('감정을 분석 중입니다...')
                        );
                        // 분석 결과 추가
                        return [...filteredMessages, { 
                            id: Date.now(), 
                            text: `${backendEmotion}하셨군요... ${aiComment} ${empathyEmoji}`, 
                            sender: 'bot' 
                        }];
                    });
                    
                    // 3. 통계 데이터 새로고침
                    await loadStatistics();
                    
                    // 4. 캘린더 데이터 새로고침
                    await loadCalendarData();
                    
                    // 5. 추천 콘텐츠 표시 (메시지 추가 후 버튼 표시)
                    setTimeout(() => {
                        addBotMessage('🎁 당신을 위한 추천 콘텐츠가 도착했습니다');
                        showRecommendations(backendEmotion);
                    }, 1000);
                    
                    setTyping(false);
                    
                    // 6. 추천 콘텐츠 버튼 표시
                    setTimeout(() => {
                        addBotMessage('👇 AI 가 추천 콘텐츠 보기를 눌러보세요');
                    }, 1500);
                    
                    // 7. 추천 콘텐츠 버튼 추가 (AI 답변 말풍선 아래에)
                    setTimeout(() => {
                        setMessages(prev => [...prev, { 
                            id: Date.now() + 1, 
                            text: `AI 가 추천 콘텐츠 보기`, 
                            sender: 'bot',
                            isRecommendationButton: true,
                            emotion: backendEmotion
                        }]);
                    }, 2000);
                    
                } catch (aiError) {
                    setTyping(false);
                    console.error('AI 분석 실패:', aiError);
                    // 실패 시 더미 응답 (분석 중 메시지 제거)
                    setMessages(prev => {
                        const filteredMessages = prev.filter(msg => 
                            !msg.text.includes('감정을 분석 중입니다...')
                        );
                        const empathyEmoji = getEmpathyEmoji(backendEmotion);
                        return [...filteredMessages, { 
                            id: Date.now(), 
                            text: `${backendEmotion}하셨군요... 공감합니다. ${empathyEmoji}`, 
                            sender: 'bot' 
                        }];
                    });
                    
                    // 통계/캘린더도 새로고침
                    await loadStatistics();
                    await loadCalendarData();
                    
                    setTimeout(() => {
                        addBotMessage('🎁 당신을 위한 추천 콘텐츠가 도착했습니다');
                        showRecommendations(backendEmotion);
                    }, 1000);
                }
                
            } catch (error: any) {
                console.error('일기 저장 실패:', error);
                // API 실패 시 alert 표시 및 분석 중 메시지 제거
                const errorMsg = error.response?.data?.message || '일기 저장에 실패했습니다. 다시 시도해주세요.';
                alert(`저장 실패: ${errorMsg}`);
                setMessages(prev => prev.filter(msg => !msg.text.includes('감정을 분석 중입니다...')));
            }
        }
    };
    
    // 통계 데이터 로드
    const loadStatistics = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth() + 1;
            
            const response = await axios.get(
                `${API_BASE_URL}/api/diaries/statistics`,
                {
                    params: { year, month },
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            // ApiResponse 계층 처리: response.data.data
            setStatistics(response.data.data);
        } catch (error) {
            console.error('통계 데이터 로드 실패:', error);
        }
    };
    
    // 캘린더 데이터 로드
    const loadCalendarData = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get(
                `${API_BASE_URL}/api/diaries`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            // ApiResponse 계층 처리: response.data.data
            const diaries = response.data.data || response.data;
            
            // 날짜별 감정 데이터로 변환 (createdAt 필드 사용)
            const dayData: CalendarDayData[] = diaries.map((diary: any) => ({
                date: diary.createdAt ? diary.createdAt.substring(0, 10) : diary.date,
                emotion: diary.emotion || '중립'
            }));
            setCalendarDayData(dayData);
        } catch (error) {
            console.error('캘린더 데이터 로드 실패:', error);
        }
    };
    
    // 추천 콘텐츠 표시
    const showRecommendations = (emotion: string) => {
        setCurrentView('recommendations');
        const recs = RECOMMENDATIONS[emotion] || RECOMMENDATIONS['기쁨'];
        setRecommendations(recs);
    };
    
    // 감정 반응
    const getEmotionReaction = (emotion: string): string => {
        const reactionsList = EMOTION_REACTIONS[emotion] || EMOTION_REACTIONS['기쁨'];
        return reactionsList[Math.floor(Math.random() * reactionsList.length)];
    };
    
    // 봇 응답 생성 (더미)
    const generateBotResponse = (message: string): string => {
        const responses = [
            '그렇군요! 😊',
            '재미있는 이야기네요! ✨',
            '더 말씀해 주세요! 🌼',
            '공감합니다! 💙',
            '좋은 생각이에요! 👍',
            '이해합니다! 🤗'
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    };
    
    // 메시지 추가
    const addUserMessage = (text: string) => {
        setMessages(prev => [...prev, { id: Date.now(), text, sender: 'user' }]);
    };
    
    const addBotMessage = (text: string) => {
        setMessages(prev => [...prev, { id: Date.now(), text, sender: 'bot' }]);
    };
    
    // 감정 이모지
    const getEmotionEmoji = (emotion: string): string => {
        return EMOTION_EMOJI[emotion] || '';
    };
    
    // 공감 이모지
    const getEmpathyEmoji = (emotion: string): string => {
        return EMPATHY_EMOJI[emotion] || '💙';
    };
    
    // 날짜 포맷
    const formatDateKey = (date: Date): string => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };
    
    // 메뉴 클릭 처리
    const handleMenuClick = (view: typeof currentView) => {
        setCurrentView(view);
    };
    
    // 로그아웃
    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('tokenType');
        localStorage.removeItem('expiresIn');
        window.location.href = '/login';
    };
    
    // 문의하기 제출
    const handleSubmitInquiry = () => {
        if (!inquiryTitle.trim() || !inquiryContent.trim()) {
            alert('제목과 내용을 모두 입력해주세요.');
            return;
        }
        
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        const newInquiry: Inquiry = {
            title: inquiryTitle.trim(),
            content: inquiryContent.trim(),
            date: dateStr
        };
        
        setInquiries(prev => [newInquiry, ...prev]);
        setInquiryTitle('');
        setInquiryContent('');
        alert('전송되었습니다! 📞');
    };
    
    // 문의하기 삭제
    const handleDeleteInquiry = (index: number) => {
        setInquiries(prev => prev.filter((_, i) => i !== index));
    };
    
    // 문의하기 팝업 토글
    const toggleInquiryPopup = () => {
        if (isInquiryOpen) {
            setIsInquiryOpen(false);
        } else {
            setIsInquiryOpen(true);
        }
    };
    
    // 추천 콘텐츠 팝업 열기
    const openRecommendationPopup = (emotion: string) => {
        setPopupEmotion(emotion);
        setIsRecommendationPopupOpen(true);
    };
    
    // 추천 콘텐츠 팝업 닫기
    const closeRecommendationPopup = () => {
        setIsRecommendationPopupOpen(false);
    };
    
    return (
        <div className="app-container">
            {/* 웰컴 메시지 팝업 */}
            {isWelcomeOpen && (
                <div className="welcome-popup active">
                    <div className="welcome-popup__content">
                        <button className="popup-close-btn" onClick={handleCloseWelcome}>×</button>
                        <div className="welcome-popup__title">프리지아 웰컴 메시지</div>
                        <div className="welcome-message-list">
                            {WELCOME_MESSAGES.map((item, index) => (
                                <div 
                                    key={index} 
                                    className={`welcome-message ${index === visibleWelcomeIndex ? 'visible' : ''}`}
                                >
                                    <div className="welcome-message-title">{item.title}</div>
                                    <div className="welcome-message-text">{item.message}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            
            {/* 문의하기 팝업 */}
            {isInquiryOpen && (
                <div className="inquiry-popup active">
                    <div className="inquiry-popup__content">
                        <button className="popup-close-btn" onClick={toggleInquiryPopup}>×</button>
                        <div className="inquiry-popup__title">📞 문의하기</div>
                        
                        <div className="inquiry-form">
                            <label htmlFor="inquiryTitle">문의 제목</label>
                            <input 
                                type="text" 
                                id="inquiryTitle" 
                                value={inquiryTitle}
                                onChange={(e) => setInquiryTitle(e.target.value)}
                                placeholder="제목을 입력하세요"
                                maxLength={50}
                            />
                            
                            <label htmlFor="inquiryContent">문의 내용</label>
                            <textarea 
                                id="inquiryContent" 
                                value={inquiryContent}
                                onChange={(e) => setInquiryContent(e.target.value)}
                                placeholder="문의 내용을 입력하세요"
                                rows={5}
                            />
                            
                            <button className="inquiry-submit-btn" onClick={handleSubmitInquiry}>전송</button>
                        </div>
                        
                        <div className="inquiry-history">
                            <h4>📋 나의 문의 내역</h4>
                            <div className="inquiry-history-list">
                                {inquiries.length === 0 ? (
                                    <p style={{color: '#999', textAlign: 'center', padding: '20px'}}>아직 문의 내역이 없습니다.</p>
                                ) : (
                                    inquiries.map((inquiry, index) => (
                                        <div key={index} className="inquiry-item">
                                            <div className="inquiry-item-header">
                                                <div className="inquiry-item-title">{inquiry.title}</div>
                                                <div className="inquiry-item-actions">
                                                    <span className="inquiry-item-date">{inquiry.date}</span>
                                                    <button 
                                                        className="inquiry-delete-btn" 
                                                        onClick={() => handleDeleteInquiry(index)}
                                                    >×</button>
                                                </div>
                                            </div>
                                            <div className="inquiry-item-content">{inquiry.content}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* 추천 콘텐츠 팝업 */}
            {isRecommendationPopupOpen && (
                <div className="recommendation-popup active">
                    <div className="recommendation-popup__content">
                        <button className="popup-close-btn" onClick={closeRecommendationPopup}>×</button>
                        <div className="recommendation-popup__title">
                            🎵 AI 가 추천하는 콘텐츠 - {popupEmotion}
                        </div>
                        
                        <div className="recommendation-popup__body">
                            <div className="recommendation-popup__section">
                                <div className="recommendation-popup__section-icon">🎵</div>
                                <div className="recommendation-popup__section-content">
                                    <div className="recommendation-popup__section-title">
                                        {RECOMMENDATION_POPUP_DATA[popupEmotion]?.song.title || '추천 노래'}
                                    </div>
                                    <div className="recommendation-popup__lyrics">
                                        {RECOMMENDATION_POPUP_DATA[popupEmotion]?.song.lyrics || ''}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="recommendation-popup__divider"></div>
                            
                            <div className="recommendation-popup__section">
                                <div className="recommendation-popup__section-icon">✍️</div>
                                <div className="recommendation-popup__section-content">
                                    <div className="recommendation-popup__section-title">
                                        {RECOMMENDATION_POPUP_DATA[popupEmotion]?.poem.title || '추천 글귀'}
                                    </div>
                                    <div className="recommendation-popup__lyrics">
                                        {RECOMMENDATION_POPUP_DATA[popupEmotion]?.poem.lyrics || ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <button className="recommendation-popup__close-btn" onClick={closeRecommendationPopup}>
                            닫기
                        </button>
                    </div>
                </div>
            )}
            
            {/* 사이드바 */}
            <nav className="sidebar">
                <button 
                    className={`menu-button ${currentView === 'chat' ? 'active' : ''}`}
                    onClick={() => handleMenuClick('chat')}
                >
                    <span className="menu-icon">🏠</span>
                    <span className="menu-label">메인 화면</span>
                </button>
                <button 
                    className={`menu-button ${currentView === 'calendar' ? 'active' : ''}`}
                    onClick={() => handleMenuClick('calendar')}
                >
                    <span className="menu-icon">📅</span>
                    <span className="menu-label">캘린더 화면</span>
                </button>
                <button 
                    className={`menu-button ${currentView === 'graph' ? 'active' : ''}`}
                    onClick={() => handleMenuClick('graph')}
                >
                    <span className="menu-icon">📈</span>
                    <span className="menu-label">그래프 화면</span>
                </button>
                <button 
                    className={`menu-button ${currentView === 'recommendations' ? 'active' : ''}`}
                    onClick={() => handleMenuClick('recommendations')}
                >
                    <span className="menu-icon">⭐</span>
                    <span className="menu-label">콘텐츠 추천</span>
                </button>
                <button className="menu-button" onClick={toggleInquiryPopup}>
                    <span className="menu-icon">📞</span>
                    <span className="menu-label">문의하기</span>
                </button>
                <button 
                    className={`menu-button ${currentView === 'myInfo' ? 'active' : ''}`}
                    onClick={() => handleMenuClick('myInfo')}
                >
                    <span className="menu-icon">👤</span>
                    <span className="menu-label">내 정보</span>
                </button>
            </nav>
            
            {/* 메인 콘텐츠 */}
            <main className="main-content">
                
                {/* 채팅 컨테이너 */}
                {currentView === 'chat' && (
                    <div className="chat-container">
                        <div className="chat-header">
                            <div className="settings-icon" title="설정" onClick={handleSettingsClick}>
                                <span className="settings-icon-inner">⚙️</span>
                            </div>
                            
                            <div className="header-content">
                                <div className="brand-title">
                                    <div className="brand-icon" aria-hidden="true">
                                        <svg viewBox="0 0 64 64" fill="none">
                                            <defs>
                                                <radialGradient id="petalGradient" cx="0.4" cy="0.3" r="0.9">
                                                    <stop offset="0%" stopColor="#FFF9E6"/>
                                                    <stop offset="40%" stopColor="#FFD700"/>
                                                    <stop offset="100%" stopColor="#FFB347"/>
                                                </radialGradient>
                                                <radialGradient id="commaPetalGradient" cx="0.4" cy="0.3" r="0.9">
                                                    <stop offset="0%" stopColor="#FFE89A"/>
                                                    <stop offset="40%" stopColor="#FFD700"/>
                                                    <stop offset="100%" stopColor="#FF9F40"/>
                                                </radialGradient>
                                                <radialGradient id="centerGradient" cx="0.5" cy="0.5" r="0.6">
                                                    <stop offset="0%" stopColor="#FFEB8F"/>
                                                    <stop offset="60%" stopColor="#FFB347"/>
                                                    <stop offset="100%" stopColor="#FF9933"/>
                                                </radialGradient>
                                            </defs>
                                            <circle cx="32" cy="32" r="26" fill="rgba(255,252,240,0.7)"/>
                                            <ellipse cx="32" cy="18" rx="7" ry="11" fill="url(#petalGradient)" stroke="#FFB347" strokeWidth="0.5" opacity="0.95"/>
                                            <ellipse cx="32" cy="18" rx="7" ry="11" fill="url(#petalGradient)" stroke="#FFB347" strokeWidth="0.5" opacity="0.95" transform="rotate(60 32 32)"/>
                                            <ellipse cx="32" cy="18" rx="7" ry="11" fill="url(#petalGradient)" stroke="#FFB347" strokeWidth="0.5" opacity="0.95" transform="rotate(120 32 32)"/>
                                            <g transform="rotate(165 32 32)">
                                                <ellipse cx="32" cy="20" rx="7.5" ry="9" fill="url(#commaPetalGradient)" stroke="#FF9F40" strokeWidth="0.8" opacity="1"/>
                                                <path d="M32 29 Q30 33, 28 37 Q27 39, 29 40 Q31 39, 32 36 Q33 33, 32 29 Z" fill="url(#commaPetalGradient)" stroke="#FF9F40" strokeWidth="0.8" opacity="1"/>
                                                <ellipse cx="32" cy="22" rx="3" ry="4" fill="rgba(255,250,220,0.7)" opacity="0.8"/>
                                            </g>
                                            <ellipse cx="32" cy="18" rx="7" ry="11" fill="url(#petalGradient)" stroke="#FFB347" strokeWidth="0.5" opacity="0.95" transform="rotate(240 32 32)"/>
                                            <ellipse cx="32" cy="18" rx="7" ry="11" fill="url(#petalGradient)" stroke="#FFB347" strokeWidth="0.5" opacity="0.95" transform="rotate(300 32 32)"/>
                                            <circle cx="32" cy="32" r="6" fill="url(#centerGradient)" stroke="#FF9933" strokeWidth="0.5"/>
                                            <circle cx="30" cy="30" r="1" fill="#FFFACD" opacity="0.9"/>
                                            <circle cx="34" cy="30" r="1" fill="#FFFACD" opacity="0.9"/>
                                            <circle cx="32" cy="33" r="1" fill="#FFFACD" opacity="0.9"/>
                                            <circle cx="30" cy="33" r="0.8" fill="#FFFACD" opacity="0.8"/>
                                            <circle cx="34" cy="33" r="0.8" fill="#FFFACD" opacity="0.8"/>
                                            <circle cx="32" cy="31" r="2.5" fill="rgba(255,255,240,0.5)"/>
                                        </svg>
                                    </div>
                                    <div className="brand-text">
                                        <span className="brand-name">프리지아</span>
                                        <span className="brand-subtitle">감성일기 분석 다이어리</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="header-actions">
                                <button className="note-icon" title="프리지아 웰컴 메시지" onClick={() => {
                                    setIsWelcomeOpen(true);
                                    showWelcomeMessage(0);
                                }}>
                                    ✉️
                                    <span className="note-badge badge-hidden" aria-hidden="true"></span>
                                </button>
                                <div className="chat-toggle-container" title="모드 전환">
                                    <span id="toggleLabel" style={{fontSize:'14px',fontWeight:600, color: '#8b3f00'}}>
                                        {chatMode === 'chat' ? '채팅' : '일기'}
                                    </span>
                                    <label className="switch">
                                        <input 
                                            type="checkbox" 
                                            checked={chatMode === 'diary'}
                                            onChange={(e) => e.target.checked ? startDiaryMode() : exitDiaryMode()}
                                        />
                                        <span className="slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div className="chat-messages" ref={chatMessagesRef}>
                            {messages.map(msg => (
                                <div key={msg.id} className={`message ${msg.sender}`}>
                                    <div className="message-bubble">
                                        {msg.isRecommendationButton ? (
                                            <button 
                                                className="recommend-button" 
                                                onClick={() => openRecommendationPopup(msg.emotion || '기쁨')}
                                            >
                                                {msg.text}
                                            </button>
                                        ) : (
                                            msg.text
                                        )}
                                    </div>
                                </div>
                            ))}
                            
                            {typing && (
                                <div className="typing-indicator active">
                                    <div className="typing-dots">
                                        <div className="typing-dot"></div>
                                        <div className="typing-dot"></div>
                                        <div className="typing-dot"></div>
                                    </div>
                                </div>
                            )}
                            
                            <div ref={messagesEndRef} />
                        </div>
                        
                        {/* 감정 선택 버튼 - 일기 모드일 때 무조건 숨김 (텍스트 입력만 허용) */}
                        {/* emotion-selector 는 일기 모드에서 완전히 제거됨 */}
                        
                        <div className="chat-input-container">
                            <input 
                                type="text" 
                                className="chat-input" 
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="메시지를 입력하세요..."
                                autoComplete="off"
                            />
                            <button className="send-button" onClick={handleSendMessage}>작성</button>
                        </div>
                    </div>
                )}
                
                {/* 캘린더 화면 - 실제 데이터 연동 */}
                {currentView === 'calendar' && (
                    <div className="calendar-container">
                        <div className="calendar-header">
                            <button className="month-nav-btn" onClick={() => {
                                const m = new Date(currentMonth);
                                m.setMonth(m.getMonth() - 1);
                                setCurrentMonth(m);
                            }}>◀</button>
                            <div className="month-label">
                                {currentMonth.getFullYear()}년 {String(currentMonth.getMonth() + 1).padStart(2, '0')}월
                            </div>
                            <button className="month-nav-btn" onClick={() => {
                                const m = new Date(currentMonth);
                                m.setMonth(m.getMonth() + 1);
                                setCurrentMonth(m);
                            }}>▶</button>
                        </div>
                        <div className="calendar-weekdays">
                            <div className="weekday">일</div>
                            <div className="weekday">월</div>
                            <div className="weekday">화</div>
                            <div className="weekday">수</div>
                            <div className="weekday">목</div>
                            <div className="weekday">금</div>
                            <div className="weekday">토</div>
                        </div>
                        <div className="calendar-grid">
                            {Array.from({ length: 35 }).map((_, i) => {
                                const day = i - 2 + 1;
                                if (day < 1 || day > 31) {
                                    return <div key={i} className="calendar-day disabled"></div>;
                                }
                                
                                // 현재 날짜 계산
                                const currentYear = currentMonth.getFullYear();
                                const currentMonthNum = currentMonth.getMonth() + 1;
                                const dateKey = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                
                                // 해당 날짜의 감정 데이터 찾기
                                const dayData = calendarDayData.find(d => d.date === dateKey);
                                const emotionEmoji = dayData ? EMOTION_EMOJI[dayData.emotion] || '😊' : '';
                                
                                return (
                                    <div key={i} className="calendar-day clickable" onClick={() => {
                                        setViewingDate(dateKey);
                                    }}>
                                        <div className="day-number">{day}</div>
                                        <div className="day-emoji">{emotionEmoji || '📝'}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                
                {/* 그래프 화면 - 실제 통계 데이터 연동 */}
                {currentView === 'graph' && (
                    <div className="graph-container">
                        <div className="graph-header">
                            <div className="graph-month-nav">
                                <button className="month-nav-btn" onClick={() => {
                                    const m = new Date(graphMonth);
                                    m.setMonth(m.getMonth() - 1);
                                    setGraphMonth(m);
                                }}>◀</button>
                                <div className="month-label">
                                    {graphMonth.getFullYear()}년 {String(graphMonth.getMonth() + 1).padStart(2, '0')}월
                                </div>
                                <button className="month-nav-btn" onClick={() => {
                                    const m = new Date(graphMonth);
                                    m.setMonth(m.getMonth() + 1);
                                    setGraphMonth(m);
                                }}>▶</button>
                            </div>
                            <div>
                                <div className="graph-title">감정 분포</div>
                                <div className="graph-subtitle">실제 일기 데이터 기반</div>
                            </div>
                        </div>
                        <canvas id="emotionChart" width="860" height="340" style={{width:'100%',maxWidth:'860px',border:'1px solid rgba(255,188,122,0.5)',borderRadius:'12px',background:'#fff9ef'}}></canvas>
                        <div className="graph-legend">
                            <div className="legend-item"><span className="legend-color" style={{background:'#ff8a80'}}></span>기쁨</div>
                            <div className="legend-item"><span className="legend-color" style={{background:'#80cbc4'}}></span>슬픔</div>
                            <div className="legend-item"><span className="legend-color" style={{background:'#ffd180'}}></span>분노</div>
                            <div className="legend-item"><span className="legend-color" style={{background:'#82b1ff'}}></span>즐거움</div>
                        </div>
                        {/* 통계 정보 표시 */}
                        {statistics && (
                            <div className="statistics-info">
                                <div className="stat-item">
                                    <span className="stat-label">총 일기 수</span>
                                    <span className="stat-value">{statistics.totalDiaries}편</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">평균 점수</span>
                                    <span className="stat-value">{statistics.averageScore.toFixed(1)}점</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {/* 추천 화면 */}
                {currentView === 'recommendations' && (
                    <div className="recommendations-container">
                        <div className="rec-header">
                            <div className="rec-title">상황에 맞는 콘텐츠 추천</div>
                            <button className="rec-back" onClick={() => setCurrentView('chat')}>메인 화면으로 돌아가기</button>
                        </div>
                        <div className="rec-subtitle">상황: 최근 감정에 맞춘 추천을 준비했어요</div>
                        <div className="rec-columns">
                            <div className="rec-col">
                                <div className="rec-col-title">추천 노래 리스트</div>
                                <div className="rec-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px'}}>
                                    {recommendations.filter((_, i) => i % 2 === 0).map((rec, i) => (
                                        <div key={i} className="rec-card">
                                            <span className="rec-tag">{rec.tag}</span>
                                            <h3>{rec.title}</h3>
                                            <p>{rec.desc}</p>
                                            <a className="rec-link" href={rec.url} target="_blank" rel="noopener noreferrer">바로가기</a>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="rec-col">
                                <div className="rec-col-title">추천 글귀 리스트</div>
                                <div className="rec-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px'}}>
                                    {recommendations.filter((_, i) => i % 2 === 1).map((rec, i) => (
                                        <div key={i} className="rec-card">
                                            <span className="rec-tag">{rec.tag}</span>
                                            <h3>{rec.title}</h3>
                                            <p>{rec.desc}</p>
                                            <a className="rec-link" href={rec.url} target="_blank" rel="noopener noreferrer">바로가기</a>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* 내 정보 화면 (더미) */}
                {currentView === 'myInfo' && (
                    <div className="my-info-container">
                        <div className="my-info-header">
                            <div className="my-info-title">👤 내 정보 수정</div>
                            <button className="rec-back" onClick={() => setCurrentView('chat')}>메인 화면으로 돌아가기</button>
                        </div>
                        <div className="my-info-form">
                            <div className="info-form-group">
                                <label className="info-label">닉네임 변경</label>
                                <input type="text" className="info-input" placeholder="새로운 닉네임을 입력하세요" />
                            </div>
                            <div className="info-form-group">
                                <label className="info-label">이메일 변경</label>
                                <input type="email" className="info-input" placeholder="새로운 이메일을 입력하세요" />
                            </div>
                            <div className="info-form-group">
                                <label className="info-label">비밀번호 변경</label>
                                <input type="password" className="info-input" placeholder="새로운 비밀번호를 입력하세요" />
                            </div>
                            <div className="info-form-group">
                                <label className="info-label">새 비밀번호 확인</label>
                                <input type="password" className="info-input" placeholder="비밀번호를 다시 입력하세요" />
                            </div>
                            <div className="sns-connect-section">
                                <div className="sns-connect-title">SNS 계정 연동</div>
                                <div className="sns-connect-item">
                                    <div className="sns-connect-info">
                                        <span className="sns-icon">💬</span>
                                        <span className="sns-name">카카오톡</span>
                                    </div>
                                    <div className="sns-status connected">
                                        <span className="status-dot"></span>
                                        <span className="status-text">연동됨</span>
                                    </div>
                                </div>
                                <div className="sns-connect-item">
                                    <div className="sns-connect-info">
                                        <span className="sns-icon">🌐</span>
                                        <span className="sns-name">구글</span>
                                    </div>
                                    <div className="sns-status disconnected">
                                        <span className="status-text">연동하기</span>
                                    </div>
                                </div>
                            </div>
                            <button className="info-submit-btn">수정 완료</button>
                            <button className="logout-btn" onClick={handleLogout}>로그아웃</button>
                            <div className="withdraw-link-container">
                                <a href="#" className="withdraw-link">회원 탈퇴</a>
                            </div>
                        </div>
                    </div>
                )}
                
            </main>
        </div>
    );
}

export default MainPage;