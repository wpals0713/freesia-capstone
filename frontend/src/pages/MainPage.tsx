import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './MainPage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

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
    aiComment?: string;
    sentimentScore?: number;
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
        title: "안녕하세요! 👋",
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

// 감정 이모지 매핑 (캘린더용 - 일기장 아이콘으로 통일)
const EMOTION_EMOJI: Record<string, string> = {
    '기쁨': '📝',
    '슬픔': '📝',
    '분노': '📝',
    '즐거움': '📝',
    '중립': '📝',
    '불안': '📝'
};

// 공감 이모지 매핑
const EMPATHY_EMOJI: Record<string, string> = {
    '기쁨': '🥰',
    '즐거움': '✨',
    '슬픔': '🥺',
    '분노': '😢',
    '중립': '💙',
    '불안': '😨'
};

function MainPage() {
    // 채팅/일기 토글 상태
    const [chatMode, setChatMode] = useState<'chat' | 'diary'>('chat');
    
    // 웰컴 메시지 팝업 상태
    const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
    const [visibleWelcomeIndex, setVisibleWelcomeIndex] = useState(-1);
    
    // 채팅 관련 상태
    const [messages, setMessages] = useState<Message[]>([
        { id: 0, text: '오늘 하루의 이야기를 들려주세요 🌼', sender: 'bot' }
    ]);
    const [userInput, setUserInput] = useState('');
    const [typing, setTyping] = useState(false);
    
    // 현재 화면
    const [currentView, setCurrentView] = useState<'chat' | 'calendar' | 'graph' | 'recommendations' | 'myInfo'>('chat');
    
    // 캘린더/그래프 상태
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [graphMonth, setGraphMonth] = useState(new Date());
    const [calendarDayData, setCalendarDayData] = useState<CalendarDayData[]>([]);
    
    // 로딩 상태
    const [isLoading, setIsLoading] = useState(true);
    
    // UI 연동: 일기가 없는 날짜 모달
    const [emptyDateModalOpen, setEmptyDateModalOpen] = useState(false);
    const [emptyDateModalText, setEmptyDateModalText] = useState('');
    
    // 아코디언 모달 상태 - 여러 일기를 위한 배열
    const [selectedDiaries, setSelectedDiaries] = useState<DiaryEntry[]>([]);
    const [expandedDiaryIndex, setExpandedDiaryIndex] = useState<number | null>(null);
    
    // UI 연동: 그래프 데이터
    const [graphData, setGraphData] = useState<{ emotion: string; count: number }[]>([]);
    
    // UI 연동: 캘린더 상세 데이터용 일기 목록
    const [diaries, setDiaries] = useState<any[]>([]);
    
    // 추천 상태 (추천 화면에서 사용)
    const [recommendations] = useState<any[]>([]);
    
    // 추천 콘텐츠 팝업 상태
    const [isRecommendationPopupOpen, setIsRecommendationPopupOpen] = useState(false);
    const [popupEmotion, setPopupEmotion] = useState<string>('기쁨');
    
    // 콘텐츠 플레이어 상태
    const [isPlayerOpen, setIsPlayerOpen] = useState(false);
    const [currentPlayerDiary, setCurrentPlayerDiary] = useState<DiaryEntry | null>(null);
    
    // 치유 보관함 상태
    const [isHealingLibraryOpen, setIsHealingLibraryOpen] = useState(false);
    
    // 문의하기 상태
    const [isInquiryOpen, setIsInquiryOpen] = useState(false);
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [inquiryTitle, setInquiryTitle] = useState('');
    const [inquiryContent, setInquiryContent] = useState('');
    
    // 통계 상태
    const [statistics, setStatistics] = useState<DiaryStatistics | null>(null);
    
    // 메시지 컨테이너 참조
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatMessagesRef = useRef<HTMLDivElement>(null);
    
    // 웰컴 메시지 애니메이션
    useEffect(() => {
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
            setTimeout(() => {
                setIsWelcomeOpen(false);
            }, 1500);
            return;
        }
        
        setVisibleWelcomeIndex(index);
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
        alert('⚙️ 설정 기능이 곧 추가됩니다!');
    };
    
    // 현재 월의 일기 데이터만 필터링하는 함수
    const filterDiariesByMonth = (diaries: any[], month: Date): any[] => {
        const year = month.getFullYear();
        const monthNum = month.getMonth() + 1;
        return diaries.filter((diary: any) => {
            if (!diary.date) return false;
            const [y, m] = diary.date.split('-').map(Number);
            return y === year && m === monthNum;
        });
    };
    
    // 현재 월의 통계 데이터만 필터링하는 함수 (데이터 없는 월 초기화 포함)
    const filterStatisticsByMonth = (diaries: any[], month: Date) => {
        const filteredDiaries = filterDiariesByMonth(diaries, month);
        const emotionCounts: Record<string, number> = {};
        let totalScore = 0;
        
        filteredDiaries.forEach((diary: any) => {
            const emotion = diary.emotion || '중립';
            emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
            totalScore += diary.sentimentScore || 0;
        });
        
        const count = filteredDiaries.length;
        const avgScore = count > 0 ? totalScore / count : 0;
        
        // 데이터가 없는 경우 모든 감정을 0 으로 초기화 (6 개 감정 모두)
        if (count === 0) {
            return {
                totalDiaries: 0,
                emotionDistribution: [
                    { emotion: '기쁨', count: 0 },
                    { emotion: '슬픔', count: 0 },
                    { emotion: '분노', count: 0 },
                    { emotion: '즐거움', count: 0 },
                    { emotion: '중립', count: 0 },
                    { emotion: '불안', count: 0 }
                ],
                averageScore: 0
            };
        }
        
        return {
            totalDiaries: count,
            emotionDistribution: Object.entries(emotionCounts).map(([emotion, count]) => ({ emotion, count })),
            averageScore: avgScore
        };
    };
    
    // 초기 데이터 로드 (모든 일기 데이터를 가져옴)
    const loadInitialData = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                setIsLoading(false);
                return;
            }
            
            // 1. 일기 목록 조회 (전체 데이터)
            const diaryResponse = await axios.get(
                `${API_BASE_URL}/api/diaries`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            const allDiaries = diaryResponse.data.data || [];
            console.log('📥 초기 일기 데이터 로드:', allDiaries.length, '편');
            
            // 2. 현재 월 기준으로 필터링된 데이터 설정 (setDiaries 전에 계산)
            const currentMonthDiaries = filterDiariesByMonth(allDiaries, currentMonth);
            const currentMonthStats = filterStatisticsByMonth(allDiaries, currentMonth);
            
            // 3. 상태 업데이트 (순차적으로)
            setDiaries(allDiaries);
            
            // 캘린더 데이터 설정
            const dayData: CalendarDayData[] = currentMonthDiaries.map((diary: any) => ({
                date: diary.date || '',
                emotion: diary.emotion || '중립'
            }));
            setCalendarDayData(dayData);
            
            // 통계 데이터 설정
            setStatistics(currentMonthStats);
            
            // 그래프 데이터 설정 (현재 월 기준) - 데이터가 없는 경우 강제 초기화
            if (currentMonthDiaries.length === 0) {
                // 데이터가 0 개일 경우 모든 감정을 0 으로 강제 초기화 (6 개 감정 모두)
                setGraphData([
                    { emotion: '기쁨', count: 0 },
                    { emotion: '슬픔', count: 0 },
                    { emotion: '분노', count: 0 },
                    { emotion: '즐거움', count: 0 },
                    { emotion: '중립', count: 0 },
                    { emotion: '불안', count: 0 }
                ]);
            } else {
                const emotionCounts: Record<string, number> = {};
                currentMonthDiaries.forEach((diary: any) => {
                    const emotion = diary.emotion || '중립';
                    emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
                });
                // 6 개 감정 모두 포함하여 초기화
                const graphDataArray = [
                    { emotion: '기쁨', count: emotionCounts['기쁨'] || 0 },
                    { emotion: '슬픔', count: emotionCounts['슬픔'] || 0 },
                    { emotion: '분노', count: emotionCounts['분노'] || 0 },
                    { emotion: '즐거움', count: emotionCounts['즐거움'] || 0 },
                    { emotion: '중립', count: emotionCounts['중립'] || 0 },
                    { emotion: '불안', count: emotionCounts['불안'] || 0 }
                ];
                setGraphData(graphDataArray);
            }
            
        } catch (error) {
            console.error('초기 데이터 로드 실패:', error);
        } finally {
            // 데이터 로드 완료 후 로딩 상태 해제
            setIsLoading(false);
        }
    };
    
    // React 생명주기: 컴포넌트 마운트 시 데이터 로드 (의존성 배열 최적화)
    useEffect(() => {
        loadInitialData();
    }, [currentMonth]); // currentMonth 변경 시에도 데이터 재로드
    
    // 스크롤 자동 하단으로
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typing]);
    
    // 그래프 렌더링: graph 화면이 표시될 때만 실행 (데이터가 0 인 경우도 포함)
    useEffect(() => {
        if (currentView === 'graph' && !isLoading) {
            renderBarChart(graphData);
        }
    }, [currentView, graphData, isLoading]); // isLoading 추가하여 데이터 로드 완료 후 렌더링
    
    // 일기 모드 시작
    const startDiaryMode = () => {
        setChatMode('diary');
        setMessages([]);
        addBotMessage('오늘 하루의 이야기를 들려주세요 🌼');
    };
    
    // 일반 채팅 모드로 복귀
    const exitDiaryMode = () => {
        setChatMode('chat');
        setMessages([]);
        addBotMessage('안녕하세요! 오늘 하루는 어떠셨나요? 자유롭게 대화해보세요!');
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
                const botResponse = generateBotResponse();
                addBotMessage(botResponse);
            }, 1000);
        } else {
            // 일기 모드
            addUserMessage(message);
            setUserInput('');
            addBotMessage('감정을 분석 중입니다...');
            
            const todayKey = formatDateKey(new Date());
            
            try {
                const token = localStorage.getItem('accessToken');
                
                if (!token) {
                    alert('로그인이 필요합니다.');
                    setMessages(prev => prev.filter(msg => !msg.text.includes('감정을 분석 중입니다...')));
                    return;
                }
                
                console.log("📡 [Backend Request] Sending to /api/diaries:", { content: message, date: todayKey });
                
                const diaryResponse = await axios.post(
                    `${API_BASE_URL}/api/diaries`,
                    { 
                        content: message, 
                        date: todayKey
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                
                console.log("✅ [Backend Response] Received from /api/diaries:", diaryResponse.data);
                
                if (!diaryResponse.data.success) {
                    setMessages(prev => {
                        const filteredMessages = prev.filter(msg => 
                            !msg.text.includes('감정을 분석 중입니다...') && 
                            !msg.text.includes('저장 실패')
                        );
                        return [...filteredMessages, { 
                            id: Date.now(), 
                            text: `❌ 저장 실패: ${diaryResponse.data.message}`, 
                            sender: 'user' 
                        }];
                    });
                    setMessages(prev => prev.filter(msg => !msg.text.includes('감정을 분석 중입니다...')));
                    return;
                }
                
                // 백엔드 응답 데이터 매핑 확인 (실제 API 응답 구조에 맞게)
                const backendEmotion = diaryResponse.data.data.dominantEmotion || diaryResponse.data.data.emotion || '중립';
                const aiComment = diaryResponse.data.data.aiComment || diaryResponse.data.data.comment || '감정을 분석했습니다.';
                const sentimentScore = diaryResponse.data.data.sentimentScore || diaryResponse.data.data.score || 0;
                const empathyEmoji = getEmpathyEmoji(backendEmotion);
                
                console.log("✅ [백엔드 응답] 감정 분석 완료 — emotion:", backendEmotion, "comment:", aiComment, "score:", sentimentScore);
                
                setTyping(true);
                
                setMessages(prev => {
                    const filteredMessages = prev.filter(msg => 
                        !msg.text.includes('감정을 분석 중입니다...')
                    );
                    return [...filteredMessages, { 
                        id: Date.now(), 
                        text: `${backendEmotion}하셨군요... ${aiComment} ${empathyEmoji}`, 
                        sender: 'bot' 
                    }];
                });
                
                setTyping(false);
                
                // 1. 새 일기를 전역 diaries 상태에 즉시 추가 (실시간 동기화)
                const newDiaryEntry = {
                    id: diaryResponse.data.data.id,
                    content: message,
                    date: todayKey,
                    emotion: backendEmotion,
                    aiComment: aiComment,
                    sentimentScore: sentimentScore
                };
                setDiaries(prev => [...prev, newDiaryEntry]);
                
                // 2. 현재 월 기준으로 필터링된 데이터 재계산 (실시간 반영) - prev 사용으로 최신 상태 참조
                const updatedDiaries = [...diaries, newDiaryEntry];
                const currentMonthDiaries = filterDiariesByMonth(updatedDiaries, currentMonth);
                const currentMonthStats = filterStatisticsByMonth(updatedDiaries, currentMonth);
                
                // 3. 캘린더 데이터 업데이트
                const dayData: CalendarDayData[] = currentMonthDiaries.map((diary: any) => ({
                    date: diary.date || '',
                    emotion: diary.emotion || '중립'
                }));
                setCalendarDayData(dayData);
                
                // 4. 통계 데이터 업데이트
                setStatistics(currentMonthStats);
                
                // 5. 그래프 데이터 업데이트 (6 개 감정 모두 포함)
                const emotionCounts: Record<string, number> = {};
                currentMonthDiaries.forEach((diary: any) => {
                    const emotion = diary.emotion || '중립';
                    emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
                });
                const graphDataArray = [
                    { emotion: '기쁨', count: emotionCounts['기쁨'] || 0 },
                    { emotion: '슬픔', count: emotionCounts['슬픔'] || 0 },
                    { emotion: '분노', count: emotionCounts['분노'] || 0 },
                    { emotion: '즐거움', count: emotionCounts['즐거움'] || 0 },
                    { emotion: '중립', count: emotionCounts['중립'] || 0 },
                    { emotion: '불안', count: emotionCounts['불안'] || 0 }
                ];
                setGraphData(graphDataArray);
                
                // 추천 버튼 추가
                setTimeout(() => {
                    setMessages(prev => [...prev, { 
                        id: Date.now() + 1, 
                        text: `AI 가 추천 콘텐츠 보기`, 
                        sender: 'bot',
                        isRecommendationButton: true,
                        emotion: backendEmotion
                    }]);
                }, 1000);
                
            } catch (error: any) {
                console.error('일기 저장 실패:', error);
                const errorMsg = error.response?.data?.message || '일기 저장에 실패했습니다.';
                alert(`저장 실패: ${errorMsg}`);
                setMessages(prev => {
                    const filteredMessages = prev.filter(msg => 
                        !msg.text.includes('감정을 분석 중입니다...') && 
                        !msg.text.includes('저장 실패')
                    );
                    return [...filteredMessages, { 
                        id: Date.now(), 
                        text: `❌ 저장 실패: ${errorMsg}`, 
                        sender: 'user' 
                    }];
                });
                setMessages(prev => prev.filter(msg => !msg.text.includes('감정을 분석 중입니다...')));
            }
        }
    };
    
    // 통계 데이터 로드 (월별 필터링)
    const loadStatistics = async (monthToLoad?: Date) => {
        try {
            const token = localStorage.getItem('accessToken');
            const targetMonth = monthToLoad || currentMonth;
            const year = targetMonth.getFullYear();
            const month = targetMonth.getMonth() + 1;
            
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
            
            const statsData = response.data.data;
            if (statsData) {
                const stats = {
                    totalDiaries: statsData.totalCount || 0,
                    emotionDistribution: statsData.emotionCounts 
                        ? Object.entries(statsData.emotionCounts).map(([emotion, count]) => ({ emotion, count: Number(count) }))
                        : [],
                    averageScore: statsData.averageSentimentScore || 0
                };
                setStatistics(stats);
                
                // 그래프 데이터도 월별로 필터링
                const emotionCounts: Record<string, number> = statsData.emotionCounts || {};
                const graphDataArray = Object.entries(emotionCounts).map(([emotion, count]) => ({
                    emotion,
                    count: Number(count)
                }));
                setGraphData(graphDataArray);
            }
        } catch (error) {
            console.error('통계 데이터 로드 실패:', error);
        }
    };
    
    // 캘린더 데이터 로드
    const loadCalendarData = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth() + 1;
            
            const response = await axios.get(
                `${API_BASE_URL}/api/diaries/calendar`,
                {
                    params: { year, month },
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            const calendarData = response.data.data || [];
            
            const dayData: CalendarDayData[] = calendarData.map((item: any) => ({
                date: item.date || item.createdAt?.substring(0, 10) || '',
                emotion: item.emotion || '중립'
            }));
            setCalendarDayData(dayData);
            
            if (calendarData.length > 0) {
                const emotionCounts: Record<string, number> = {};
                calendarData.forEach((item: any) => {
                    const emotion = item.emotion || '중립';
                    emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
                });
                // 6 개 감정 모두 포함하여 초기화
                const graphDataArray = [
                    { emotion: '기쁨', count: emotionCounts['기쁨'] || 0 },
                    { emotion: '슬픔', count: emotionCounts['슬픔'] || 0 },
                    { emotion: '분노', count: emotionCounts['분노'] || 0 },
                    { emotion: '즐거움', count: emotionCounts['즐거움'] || 0 },
                    { emotion: '중립', count: emotionCounts['중립'] || 0 },
                    { emotion: '불안', count: emotionCounts['불안'] || 0 }
                ];
                setGraphData(graphDataArray);
            } else {
                // 데이터가 0 개일 경우 모든 감정을 0 으로 강제 초기화 (6 개 감정 모두)
                setGraphData([
                    { emotion: '기쁨', count: 0 },
                    { emotion: '슬픔', count: 0 },
                    { emotion: '분노', count: 0 },
                    { emotion: '즐거움', count: 0 },
                    { emotion: '중립', count: 0 },
                    { emotion: '불안', count: 0 }
                ]);
            }
        } catch (error) {
            console.error('캘린더 데이터 로드 실패:', error);
        }
    };
    
    // 봇 응답 생성
    const generateBotResponse = (): string => {
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
        if (window.confirm('로그아웃 하시겠습니까?')) {
            window.alert('로그아웃 되었습니다.');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('tokenType');
            localStorage.removeItem('expiresIn');
            window.location.href = '/login';
        }
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
    
    // 일기 삭제 함수 (삭제 API 연동 + 실시간 동기화)
    const handleDeleteDiary = async (e: React.MouseEvent, diaryId: number, diaryDate: string) => {
        e.stopPropagation(); // 아코디언 토글 이벤트 전파 방지
        
        if (!window.confirm('정말 이 일기를 삭제하시겠습니까?')) {
            return;
        }
        
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                alert('로그인이 필요합니다.');
                return;
            }
            
            console.log(`🗑️ [DELETE Request] Deleting diary with id: ${diaryId}`);
            
            const response = await axios.delete(
                `${API_BASE_URL}/api/diaries/${diaryId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            console.log('✅ [DELETE Response] Diary deleted successfully:', response.data);
            
            if (response.data.success) {
                // 1. 전체 diaries 상태에서 해당 일기 제거
                setDiaries(prev => prev.filter(d => d.id !== diaryId));
                
                // 2. 현재 보고 있는 월 기준으로 필터링된 데이터 재계산 - prev 사용으로 최신 상태 참조
                const updatedDiaries = diaries.filter(d => d.id !== diaryId);
                const currentMonthDiaries = filterDiariesByMonth(updatedDiaries, currentMonth);
                const currentMonthStats = filterStatisticsByMonth(updatedDiaries, currentMonth);
                
                // 3. 캘린더 데이터 업데이트
                const dayData: CalendarDayData[] = currentMonthDiaries.map((diary: any) => ({
                    date: diary.date || '',
                    emotion: diary.emotion || '중립'
                }));
                setCalendarDayData(dayData);
                
                // 4. 통계 데이터 업데이트
                setStatistics(currentMonthStats);
                
                // 5. 그래프 데이터 업데이트 (6 개 감정 모두 포함)
                const emotionCounts: Record<string, number> = {};
                currentMonthDiaries.forEach((diary: any) => {
                    const emotion = diary.emotion || '중립';
                    emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
                });
                const graphDataArray = [
                    { emotion: '기쁨', count: emotionCounts['기쁨'] || 0 },
                    { emotion: '슬픔', count: emotionCounts['슬픔'] || 0 },
                    { emotion: '분노', count: emotionCounts['분노'] || 0 },
                    { emotion: '즐거움', count: emotionCounts['즐거움'] || 0 },
                    { emotion: '중립', count: emotionCounts['중립'] || 0 },
                    { emotion: '불안', count: emotionCounts['불안'] || 0 }
                ];
                setGraphData(graphDataArray);
                
                // 6. 선택된 일기 목록에서 삭제된 일기 제거
                setSelectedDiaries(prev => {
                    const filtered = prev.filter(d => d.id !== diaryId);
                    // 삭제된 일기가 선택되어 있었다면, 첫 번째 일기를 자동으로 확장
                    if (filtered.length > 0 && expandedDiaryIndex === prev.findIndex(d => d.id === diaryId)) {
                        setExpandedDiaryIndex(0);
                    } else if (filtered.length === 0) {
                        setExpandedDiaryIndex(null);
                    }
                    return filtered;
                });
                
                alert('일기가 삭제되었습니다! 🗑️');
            } else {
                alert('삭제 실패: ' + (response.data.message || '알 수 없는 오류'));
            }
            
        } catch (error: any) {
            console.error('일기 삭제 실패:', error);
            const errorMsg = error.response?.data?.message || '일기 삭제에 실패했습니다.';
            alert('삭제 실패: ' + errorMsg);
        }
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
    
    // 콘텐츠 플레이어 열기
    const openPlayer = (diary: DiaryEntry) => {
        setCurrentPlayerDiary(diary);
        setIsPlayerOpen(true);
    };
    
    // 콘텐츠 플레이어 닫기
    const closePlayer = () => {
        setIsPlayerOpen(false);
        setCurrentPlayerDiary(null);
    };
    
    // 막대그래프 렌더링 함수 (수직 막대 스타일 - 얇고 깔끔하게)
    const renderBarChart = (data: { emotion: string; count: number }[]) => {
        const canvas = document.getElementById('emotionChart') as HTMLCanvasElement;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // 캔버스 크기 초기화
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = 340;
        
        const width = canvas.width;
        const height = 340;
        const padding = { top: 50, right: 40, bottom: 60, left: 60 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;
        
        const emotionOrder = ['기쁨', '슬픔', '분노', '즐거움', '중립', '불안'];
        const emotionColors: Record<string, string> = {
            '기쁨': '#ff8a80',
            '슬픔': '#80cbc4',
            '분노': '#ffd180',
            '즐거움': '#82b1ff',
            '중립': '#a06129',
            '불안': '#957dad'
        };
        
        // 최대값 계산 (0 이면 1 로 설정)
        const maxCount = Math.max(...data.map(d => d.count), 1);
        // 얇은 수직 막대 (기존보다 훨씬 좁게)
        const barWidth = 40;
        
        // 그래프 그리기
        ctx.clearRect(0, 0, width, height);
        
        // Y 축 그리기
        ctx.strokeStyle = '#ffc18c';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, padding.top + chartHeight);
        ctx.stroke();
        
        // X 축 그리기
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top + chartHeight);
        ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
        ctx.stroke();
        
        // Y 축 눈금과 라벨
        ctx.fillStyle = '#a06129';
        ctx.font = '11px Arial';
        ctx.textAlign = 'right';
        const yTicks = 5;
        for (let i = 0; i <= yTicks; i++) {
            const value = Math.round((maxCount / yTicks) * i);
            const y = padding.top + chartHeight - (i / yTicks) * chartHeight;
            
            // 눈금선
            ctx.strokeStyle = '#ffc18c';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(padding.left - 5, y);
            ctx.lineTo(padding.left, y);
            ctx.stroke();
            
            // 숫자 라벨
            ctx.fillStyle = '#a06129';
            ctx.fillText(value.toString(), padding.left - 8, y + 4);
        }
        
        // 막대 그리기 (수직 얇은 막대) - 6 개 감정용
        const barSpacing = chartWidth / 6;
        emotionOrder.forEach((emotion, index) => {
            const count = data.find(d => d.emotion === emotion)?.count || 0;
            const barHeight = maxCount > 0 ? (count / maxCount) * chartHeight : 0;
            
            // 막대 위치 (중앙 정렬)
            const x = padding.left + index * barSpacing + (barSpacing - barWidth) / 2;
            const y = padding.top + chartHeight - barHeight;
            
            // 데이터가 0 인 경우 막대 그리지 않고 바닥선만 표시
            if (count === 0) {
                // 감정 라벨만 표시
                ctx.fillStyle = '#a06129';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(emotion, x + barWidth / 2, padding.top + chartHeight + 25);
                return;
            }
            
            // 막대 그리기 (단색, 얇은 수직 막대)
            ctx.fillStyle = emotionColors[emotion] || '#b0bec5';
            ctx.strokeStyle = emotionColors[emotion] || '#b0bec5';
            ctx.lineWidth = 1;
            
            // 직사각형 (둥근 모서리 제거)
            ctx.beginPath();
            ctx.rect(x, y, barWidth, barHeight);
            ctx.fill();
            ctx.stroke();
            
            // 숫자 라벨 (막대 위)
            ctx.fillStyle = '#5c3b1e';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(count.toString(), x + barWidth / 2, y - 8);
            
            // 감정 라벨 (막대 아래)
            ctx.fillStyle = '#a06129';
            ctx.font = '12px Arial';
            ctx.fillText(emotion, x + barWidth / 2, padding.top + chartHeight + 25);
        });
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
                
                {/* 캘린더 화면 */}
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
                                
                                const currentYear = currentMonth.getFullYear();
                                const currentMonthNum = currentMonth.getMonth() + 1;
                                const dateKey = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                
                                 // 해당 날짜의 모든 일기 찾기 (여러 일기 가능)
                                 const diariesOnDay = diaries.filter((d: any) => d.date === dateKey);
                                 
                                 return (
                                     <div key={i} className="calendar-day clickable" onClick={() => {
                                         if (diariesOnDay.length > 0) {
                                             // 해당 날짜의 모든 일기를 아코디언 모달에 표시
                                             const diaryEntries: DiaryEntry[] = diariesOnDay.map((d: any) => ({
                                                 id: d.id,
                                                 text: d.content,
                                                 emotion: d.emotion || '중립',
                                                 date: d.date,
                                                 aiComment: d.aiComment || '',
                                                 sentimentScore: d.sentimentScore || 0
                                             }));
                                             setSelectedDiaries(diaryEntries);
                                             setExpandedDiaryIndex(0); // 첫 번째 일기 자동 확장
                                         } else {
                                             // 일기가 없는 날짜 클릭 시 모달 표시
                                             const dateText = `${currentYear}년 ${String(currentMonthNum).padStart(2, '0')}월 ${day}일`;
                                             setEmptyDateModalText(`📅 ${dateText}\n\n이 날은 일기가 작성되지 않았습니다.\n\n오늘은 어떤 일이 있었나요? 일기를 작성해보세요!`);
                                             setEmptyDateModalOpen(true);
                                         }
                                     }}>
                                         <div className="day-number">{day}</div>
                                         {diariesOnDay.length > 0 && <div className="day-emoji">📝</div>}
                                     </div>
                                 );
                            })}
                        </div>
                        
                        {/* 아코디언 모달 - 여러 일기 지원 */}
                        {selectedDiaries.length > 0 && !isHealingLibraryOpen && (
                            <div className="diary-detail-modal active">
                                <div className="diary-detail-modal__content">
                                    <button className="popup-close-btn" onClick={() => {
                                        setSelectedDiaries([]);
                                        setExpandedDiaryIndex(null);
                                    }}>×</button>
                                    <div className="diary-detail-modal__header">
                                        <div className="diary-detail-modal__date">
                                            📅 일기 목록
                                        </div>
                                    </div>
                                    <div className="diary-detail-modal__body">
                                        {selectedDiaries.map((diary, index) => (
                                            <div key={index} className="diary-accordion-item">
                                                <div 
                                                    className="diary-accordion-header"
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => setExpandedDiaryIndex(expandedDiaryIndex === index ? null : index)}
                                                >
                                                    <div className="diary-accordion-title">
                                                        <span className="diary-accordion-time">
                                                            {index + 1}. {diary.date}
                                                        </span>
                                                        <span className="diary-accordion-emotion">
                                                            {diary.emotion === '기쁨' ? '😊' : diary.emotion === '슬픔' ? '😢' : diary.emotion === '분노' ? '😡' : diary.emotion === '즐거움' ? '🎉' : '😐'} {diary.emotion}
                                                        </span>
                                                        {diary.id !== undefined && diary.id !== null && (
                                                            <button
                                                                className="diary-delete-btn"
                                                                onClick={(e) => handleDeleteDiary(e, diary.id!, diary.date)}
                                                                style={{
                                                                    background: 'rgba(255, 138, 128, 0.2)',
                                                                    color: '#d63031',
                                                                    border: 'none',
                                                                    borderRadius: '50%',
                                                                    width: '24px',
                                                                    height: '24px',
                                                                    fontSize: '16px',
                                                                    fontWeight: '700',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    padding: 0,
                                                                    transition: 'all 0.2s',
                                                                    marginLeft: '8px'
                                                                }}
                                                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 138, 128, 0.4)'}
                                                                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 138, 128, 0.2)'}
                                                            >
                                                                ×
                                                            </button>
                                                        )}
                                                    </div>
                                                    <span className="diary-accordion-icon">
                                                        {expandedDiaryIndex === index ? '▲' : '▼'}
                                                    </span>
                                                </div>
                                                {expandedDiaryIndex === index && (
                                                    <div className="diary-accordion-content" style={{ display: 'block', padding: '10px' }}>
                                                        <div className="diary-detail-modal__section">
                                                            <div className="diary-detail-modal__section-title">📝 작성한 일기 내용</div>
                                                            <div className="diary-detail-modal__section-content">
                                                                {diary.text}
                                                            </div>
                                                        </div>
                                                        <div className="diary-detail-modal__section">
                                                            <div className="diary-detail-modal__section-title">💭 AI 분석 결과</div>
                                                            <div className="diary-detail-modal__section-content">
                                                                <div className="diary-detail-modal__ai-comment">
                                                                    {diary.aiComment || '감정을 분석했습니다.'}
                                                                </div>
                                                                <div className="diary-detail-modal__sentiment-score">
                                                                    감성 점수: {(diary.sentimentScore || 0).toFixed(2)}점
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="diary-detail-modal__section">
                                                            <div className="diary-detail-modal__section-title">🎁 추천 콘텐츠</div>
                                                            <div className="diary-detail-modal__section-content">
                                                                <button 
                                                                    className="recommend-button" 
                                                                    onClick={() => {
                                                                        setIsHealingLibraryOpen(true);
                                                                    }}
                                                                >
                                                                    🎵 오디오 클립: 마음 안정 유도하기
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* 나의 치유 보관함 뷰 */}
                        {isHealingLibraryOpen && (
                            <div className="diary-detail-modal active">
                                <div className="diary-detail-modal__content">
                                    <button className="popup-close-btn" onClick={() => setIsHealingLibraryOpen(false)}>×</button>
                                    <div className="diary-detail-modal__header">
                                        <div className="diary-detail-modal__date">
                                            🌿 나의 치유 보관함
                                        </div>
                                    </div>
                                    <div className="diary-detail-modal__body">
                                        <button className="rec-back" onClick={() => setIsHealingLibraryOpen(false)} style={{marginBottom: '20px'}}>
                                            📅 일기 목록으로 돌아가기
                                        </button>
                                        
                                        <div className="rec-columns">
                                            <div className="rec-col">
                                                <div className="rec-col-title">🎵 잔잔한 위로 플레이리스트</div>
                                                <div className="rec-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px'}}>
                                                    <div className="rec-card">
                                                        <span className="rec-tag">음악</span>
                                                        <h3>잔잔한 위로</h3>
                                                        <p>흐르는 눈물을 닦아주며 / 당신의 곁에 있을게요</p>
                                                    </div>
                                                    <div className="rec-card">
                                                        <span className="rec-tag">음악</span>
                                                        <h3>차분한 하루</h3>
                                                        <p>조용한 시간을 보내며 / 마음을 정리해요</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="rec-col">
                                                <div className="rec-col-title">✨ 오늘의 긍정 한 줄</div>
                                                <div className="rec-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px'}}>
                                                    <div className="rec-card">
                                                        <span className="rec-tag">글귀</span>
                                                        <h3>오늘의 위로</h3>
                                                        <p>당신의 가치는 흔들리지 않아요 / 오늘도 충분히 잘했어요</p>
                                                    </div>
                                                    <div className="rec-card">
                                                        <span className="rec-tag">글귀</span>
                                                        <h3>평온함</h3>
                                                        <p>조용한 물결처럼 / 흐르는 시간을 느껴보세요</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* 일기가 없는 날짜 모달 */}
                        {emptyDateModalOpen && (
                            <div className="empty-date-modal active">
                                <div className="empty-date-modal__content">
                                    <button className="popup-close-btn" onClick={() => setEmptyDateModalOpen(false)}>×</button>
                                    <div className="empty-date-modal__body">
                                        <div className="empty-date-modal__icon">📅</div>
                                        <div className="empty-date-modal__text" dangerouslySetInnerHTML={{ __html: emptyDateModalText.replace(/\n/g, '<br />') }} />
                                        <button 
                                            className="write-diary-btn" 
                                            onClick={() => {
                                                setEmptyDateModalOpen(false);
                                                setCurrentView('chat');
                                                startDiaryMode();
                                            }}
                                        >
                                            일기 쓰기
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {/* 그래프 화면 */}
                {currentView === 'graph' && (
                    <div className="graph-container">
                        <div className="graph-header">
                            <div className="graph-month-nav">
                                <button className="month-nav-btn" onClick={() => {
                                    const m = new Date(graphMonth);
                                    m.setMonth(m.getMonth() - 1);
                                    setGraphMonth(m);
                                    loadStatistics(m);
                                }}>◀</button>
                                <div className="month-label">
                                    {graphMonth.getFullYear()}년 {String(graphMonth.getMonth() + 1).padStart(2, '0')}월
                                </div>
                                <button className="month-nav-btn" onClick={() => {
                                    const m = new Date(graphMonth);
                                    m.setMonth(m.getMonth() + 1);
                                    setGraphMonth(m);
                                    loadStatistics(m);
                                }}>▶</button>
                            </div>
                            <div>
                                <div className="graph-title">감정 분포</div>
                                <div className="graph-subtitle">실제 일기 데이터 기반</div>
                            </div>
                        </div>
                        
                        <div style={{width: '100%', maxWidth: '860px', height: '340px', margin: '0 auto', position: 'relative'}}>
                            <canvas id="emotionChart" width="860" height="340" style={{width:'100%',maxWidth:'860px',border:'1px solid rgba(255,188,122,0.5)',borderRadius:'12px',background:'#fff9ef'}}></canvas>
                            <div style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none'}}>
                                {null}
                            </div>
                        </div>
                        
                        <div className="graph-legend">
                            <div className="legend-item"><span className="legend-color" style={{background:'#ff8a80'}}></span>기쁨</div>
                            <div className="legend-item"><span className="legend-color" style={{background:'#80cbc4'}}></span>슬픔</div>
                            <div className="legend-item"><span className="legend-color" style={{background:'#ffd180'}}></span>분노</div>
                            <div className="legend-item"><span className="legend-color" style={{background:'#82b1ff'}}></span>즐거움</div>
                            <div className="legend-item"><span className="legend-color" style={{background:'#a06129'}}></span>중립</div>
                            <div className="legend-item"><span className="legend-color" style={{background:'#957dad'}}></span>불안</div>
                        </div>
                        
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
                
                {/* 내 정보 화면 */}
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
            
            {/* 콘텐츠 플레이어 뷰 */}
            {isPlayerOpen && currentPlayerDiary && (
                <div className="content-player-overlay active">
                    <div className="content-player">
                        <div className="content-player__header">
                            <button className="content-player__back-btn" onClick={closePlayer}>
                                ←
                            </button>
                            <div className="content-player__title">
                                🎵 오디오 클립: 마음 안정 유도하기
                            </div>
                        </div>
                        
                        <div className="content-player__cover">
                            <div className="content-player__cover-icon">🎧</div>
                        </div>
                        
                        <div className="content-player__seek-bar">
                            <div className="content-player__seek-progress"></div>
                        </div>
                        
                        <div className="content-player__time">
                            <span>01:23</span>
                            <span>04:30</span>
                        </div>
                        
                        <div className="content-player__controls">
                            <button className="content-player__control-btn">⏮</button>
                            <button className="content-player__control-btn play">▶</button>
                            <button className="content-player__control-btn">⏭</button>
                        </div>
                        
                        <div className="content-player__description">
                            <div className="content-player__description-title">📝 추천 이유</div>
                            <div>
                                {currentPlayerDiary.emotion}한 감정을 가지고 계신 것 같아요. 
                                이 오디오 클립은 당신의 감정을 안정시키고 마음을 편안하게 하는 데 도움이 될 거예요.
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MainPage;
