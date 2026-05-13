import { useState, useEffect } from 'react';
import {
  startOfMonth,
  getDaysInMonth,
  getDay,
  format,
  addMonths,
  subMonths,
  isSameDay,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import type { DiaryResponse } from '../api/diary';
import { getCalendarDiaries, type DiaryCalendarResponse, getDiaryDetail, type DiaryDetailResponse } from '../api/diary';
import { getRecommendations, type RecommendationResponse } from '../api/recommendation';

// 감정 타입 정의 (즐거움 추가)
type EmotionType = '기쁨' | '슬픔' | '분노' | '불안' | '중립' | '즐거움';

// 감정 이모티콘 매핑 - 백엔드 emotion 값과 정확히 일치하도록 설정
const EMOTION_EMOJI_MAP: Record<string, string> = {
  '기쁨': '😊',
  '슬픔': '😢',
  '분노': '😡',
  '불안': '😰',
  '중립': '😐',
  '즐거움': '🎉',
};

const EMOTION_CONFIG: Record<EmotionType, { emoji: string; color: string; bgColor: string; hoverBgColor: string }> = {
  기쁨: { emoji: '😊', color: 'text-yellow-600', bgColor: 'bg-yellow-100', hoverBgColor: 'hover:bg-yellow-200' },
  슬픔: { emoji: '😢', color: 'text-blue-600', bgColor: 'bg-blue-100', hoverBgColor: 'hover:bg-blue-200' },
  분노: { emoji: '😡', color: 'text-red-600', bgColor: 'bg-red-100', hoverBgColor: 'hover:bg-red-200' },
  불안: { emoji: '😰', color: 'text-violet-600', bgColor: 'bg-violet-100', hoverBgColor: 'hover:bg-violet-200' },
  중립: { emoji: '😐', color: 'text-gray-600', bgColor: 'bg-gray-100', hoverBgColor: 'hover:bg-gray-200' },
  즐거움: { emoji: '🎉', color: 'text-pink-600', bgColor: 'bg-pink-100', hoverBgColor: 'hover:bg-pink-200' },
};

const EMOTION_BUTTONS: EmotionType[] = ['기쁨', '슬픔', '분노', '불안', '중립', '즐거움'];

// 카테고리별 추천 콘텐츠 타입 정의
type CategoryType = 'MUSIC' | 'MOVIE' | 'BOOK' | 'ACTIVITY';

const CATEGORY_CONFIG: Record<CategoryType, { icon: string; color: string; bgColor: string }> = {
  MUSIC: { icon: '🎵', color: 'text-pink-600', bgColor: 'bg-pink-100' },
  MOVIE: { icon: '🎬', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  BOOK: { icon: '📚', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  ACTIVITY: { icon: '🏃', color: 'text-green-600', bgColor: 'bg-green-100' },
};

const DOW_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

interface Props {
  diaries: DiaryResponse[];
}

export default function EmotionCalendar({ diaries }: Props) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showEmotionModal, setShowEmotionModal] = useState(false);
  const [calendarDiaries, setCalendarDiaries] = useState<DiaryCalendarResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDiaryDetail, setSelectedDiaryDetail] = useState<DiaryDetailResponse | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationResponse[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const today = new Date();

  // memberId: 실제 구현 시 authStore 에서 가져와야 함 (임시 고정값)
  const memberId = 1;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-indexed

  // 해당 월의 1 일 요일 (0=일, 6=토)
  const startDow = getDay(startOfMonth(viewDate));
  const daysInMonth = getDaysInMonth(viewDate);

  // 백엔드 API 로 월별 일기 데이터 조회
  useEffect(() => {
    const fetchCalendarDiaries = async () => {
      setLoading(true);
      try {
        const data = await getCalendarDiaries(memberId, year, month + 1);
        console.log('캘린더 데이터:', data);
        setCalendarDiaries(data);
      } catch (error) {
        console.error('감정 달력 데이터 조회 실패:', error);
        setCalendarDiaries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCalendarDiaries();
  }, [year, month, memberId]);

  // 일기 맵: "YYYY-MM-DD" → DiaryCalendarResponse 전체 객체 (diaryId 포함)
  const diaryMap: Record<string, DiaryCalendarResponse> = {};
  calendarDiaries.forEach((d) => {
    if (d.createdAt && d.emotion) {
      diaryMap[d.createdAt] = d;
    }
  });

  // 날짜 클릭 시 일기 상세 조회 및 추천 콘텐츠 조회
  const handleDateClick = async (day: number) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const dateStr = `${year}-${mm}-${dd}`;
    const diary = diaryMap[dateStr];

    console.log('클릭된 날짜:', dateStr, '일기 데이터:', diary);

    if (diary) {
      try {
        // 일기 상세 조회
        const detail = await getDiaryDetail(diary.diaryId);
        console.log('일기 상세:', detail);
        setSelectedDiaryDetail(detail);
        
        // 추천 콘텐츠 조회
        if (detail.emotion) {
          setRecommendationsLoading(true);
          console.log('추천 콘텐츠 조회 - emotion:', detail.emotion);
          const recData = await getRecommendations(detail.emotion);
          console.log('추천 콘텐츠 데이터:', recData);
          setRecommendations(recData);
        }
        
        setIsDetailModalOpen(true);
      } catch (error) {
        console.error('일기 상세 조회 실패:', error);
        alert('일기 상세를 불러오는데 실패했어요. 😭');
      }
    }
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedDiaryDetail(null);
    setRecommendations([]);
  };

  // 달력 셀 배열: null=빈칸, number=날짜
  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = format(viewDate, 'yyyy 년 M 월', { locale: ko });

  const handleEmotionSelect = (emotion: EmotionType) => {
    if (selectedDate) {
      console.log(`선택된 날짜: ${selectedDate}, 감정: ${emotion}`);
      // TODO: 백엔드 API 로 감정 전송
      setShowEmotionModal(false);
      setSelectedDate(null);
    }
  };

  const closeEmotionModal = () => {
    setShowEmotionModal(false);
    setSelectedDate(null);
  };

  // 추천 콘텐츠를 카테고리로 그룹화
  const groupedRecommendations: Record<CategoryType, RecommendationResponse[]> = {
    MUSIC: [],
    MOVIE: [],
    BOOK: [],
    ACTIVITY: [],
  };

  recommendations.forEach((rec) => {
    if (rec.category) {
      const category = rec.category.toUpperCase() as CategoryType;
      if (groupedRecommendations[category]) {
        groupedRecommendations[category].push(rec);
      }
    }
  });

  // emotion 값을 기반으로 이모티콘을 가져오는 함수
  const getEmojiForEmotion = (emotion: string | null | undefined): string => {
    if (!emotion) return '';
    return EMOTION_EMOJI_MAP[emotion] || '';
  };

  // emotion 값을 기반으로 배경색을 가져오는 함수
  const getBgColorForEmotion = (emotion: string | null | undefined): string => {
    if (!emotion) return '';
    const config = EMOTION_CONFIG[emotion as EmotionType];
    return config ? config.bgColor : '';
  };

  // emotion 값을 기반으로 텍스트 색상을 가져오는 함수
  const getColorForEmotion = (emotion: string | null | undefined): string => {
    if (!emotion) return '';
    const config = EMOTION_CONFIG[emotion as EmotionType];
    return config ? config.color : '';
  };

  return (
    <section className="bg-white rounded-3xl shadow-lg border-2 border-yellow-100 p-8">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-8">
        <span className="text-2xl">📅</span>
        <h2 className="text-2xl font-bold text-gray-800">감정 달력</h2>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setViewDate((d) => subMonths(d, 1))}
            className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-yellow-100 hover:text-yellow-600 transition-all duration-200 text-lg font-bold shadow-sm hover:shadow-md"
            aria-label="이전 달"
          >
            ‹
          </button>
          <span className="text-lg font-semibold text-gray-700 w-[8rem] text-center">
            {monthLabel}
          </span>
          <button
            onClick={() => setViewDate((d) => addMonths(d, 1))}
            className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-yellow-100 hover:text-yellow-600 transition-all duration-200 text-lg font-bold shadow-sm hover:shadow-md"
            aria-label="다음 달"
          >
            ›
          </button>
        </div>
      </div>

      {/* 로딩 표시 */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500">감정 달력을 불러오는 중이에요...</p>
          </div>
        </div>
      )}

      {/* 요일 헤더 */}
      {!loading && (
        <div className="grid grid-cols-7 mb-4">
          {DOW_NAMES.map((name, i) => (
            <div
              key={name}
              className={`text-center text-sm font-bold py-2 ${
                i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'
              }`}
            >
              {name}
            </div>
          ))}
        </div>
      )}

      {/* 날짜 격자 */}
      {!loading && (
        <div className="grid grid-cols-7 gap-2">
          {cells.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="aspect-square" />;
            }

            const mm = String(month + 1).padStart(2, '0');
            const dd = String(day).padStart(2, '0');
            const dateStr = `${year}-${mm}-${dd}`;

            const isToday = isSameDay(viewDate, new Date(year, month, day));
            const diary = diaryMap[dateStr];
            const emotion = diary?.emotion || null;
            const emoji = getEmojiForEmotion(emotion);
            const bgColor = getBgColorForEmotion(emotion);
            const color = getColorForEmotion(emotion);
            const dow = idx % 7; // 0=일, 6=토

            return (
              <button
                key={dateStr}
                onClick={() => handleDateClick(day)}
                className={`
                  aspect-square rounded-2xl flex flex-col items-center justify-center
                  transition-all duration-300 transform
                  ${
                    isToday
                      ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-white shadow-lg scale-105'
                      : emoji
                      ? `${bgColor} ${color} hover:scale-105 cursor-pointer`
                      : 'bg-gray-50 hover:bg-yellow-50 hover:scale-105 cursor-default'
                  }
                  ${!isToday && !emoji ? 'text-gray-600' : ''}
                `}
              >
                {/* 날짜 숫자 */}
                <span
                  className={`
                    text-lg leading-none font-bold
                    ${isToday ? 'text-white' : dow === 0 ? 'text-red-400' : dow === 6 ? 'text-blue-400' : 'text-gray-700'}
                  `}
                >
                  {day}
                </span>

                {/* 감정 이모지 도장 - 우측 하단 배치 (연필 아이콘 제거) - !important 로 강제 적용 */}
                {emoji && (
                  <span
                    className="animate-bounce-short"
                    style={{
                      position: 'absolute' as any,
                      bottom: '8px' as any,
                      right: '8px' as any,
                      fontSize: '20px' as any,
                      lineHeight: '1' as any,
                      zIndex: '10' as any,
                    } as React.CSSProperties}
                  >
                    {emoji}
                  </span>
                )}

                {/* 오늘 표시 */}
                {isToday && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 범례 */}
      {!loading && (
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6 pt-4 border-t-2 border-yellow-100">
          <span className="text-sm font-semibold text-gray-500">감정 범례:</span>
          {Object.entries(EMOTION_CONFIG).map(([label, config]) => (
            <span
              key={label}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                ${config.bgColor} ${config.color} transition-all duration-200 hover:scale-110
              `}
            >
              <span>{config.emoji}</span>
              {label}
            </span>
          ))}
        </div>
      )}

      {/* 감정 선택 모달 */}
      {showEmotionModal && selectedDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl animate-scale-in">
            {/* 모달 헤더 */}
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                📅 {selectedDate}의 감정
              </h3>
              <p className="text-sm text-gray-500">
                {new Date(selectedDate).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                })}
              </p>
            </div>

            {/* 감정 버튼 그리드 */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {EMOTION_BUTTONS.map((emotion) => {
                const config = EMOTION_CONFIG[emotion];
                const currentEmotion = diaryMap[selectedDate]?.emotion as unknown as EmotionType | undefined;
                const isSelected = currentEmotion === emotion;

                return (
                  <button
                    key={emotion}
                    onClick={() => handleEmotionSelect(emotion)}
                    className={`
                      flex flex-col items-center gap-2 p-4 rounded-2xl
                      transition-all duration-300 transform hover:scale-105
                      ${
                        isSelected
                          ? `${config.bgColor} ${config.color} ring-2 ring-yellow-400 shadow-lg`
                          : 'bg-gray-50 hover:bg-yellow-50 text-gray-600'
                      }
                    `}
                  >
                    <span className="text-3xl">{config.emoji}</span>
                    <span className="text-sm font-semibold">{emotion}</span>
                  </button>
                );
              })}
            </div>

            {/* 닫기 버튼 */}
            <button
              onClick={closeEmotionModal}
              className="w-full py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold transition-colors duration-200"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 일기 상세 보기 모달 */}
      {isDetailModalOpen && selectedDiaryDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in" onClick={closeDetailModal}>
          <div 
            className="bg-white rounded-3xl p-8 max-w-2xl w-full mx-4 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">
                {selectedDiaryDetail.emoji || '📝'}
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                📅 {selectedDiaryDetail.date}의 일기
              </h3>
              <p className="text-sm text-gray-500">
                {new Date(selectedDiaryDetail.date).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                })}
              </p>
            </div>

            {/* 감정 표시 */}
            {selectedDiaryDetail.emotion && (
              <div className="text-center mb-6">
                <span className="inline-block px-4 py-2 rounded-full bg-yellow-100 text-yellow-700 font-semibold">
                  감정: {selectedDiaryDetail.emotion}
                </span>
              </div>
            )}

            {/* 일기 내용 */}
            <div className="bg-gray-50 rounded-2xl p-6 mb-6">
              <h4 className="text-sm font-semibold text-gray-600 mb-3">📝 일기 내용</h4>
              <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">
                {selectedDiaryDetail.content}
              </p>
            </div>

            {/* AI 위로 코멘트 및 감성 점수 */}
            {(selectedDiaryDetail.aiComment || selectedDiaryDetail.sentimentScore !== null) && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-600 mb-2">💌 AI 의 위로</h4>
                <div className="bg-purple-50 rounded-xl p-4">
                  {selectedDiaryDetail.aiComment && (
                    <p className="text-gray-600 text-sm leading-relaxed mb-2">
                      {selectedDiaryDetail.aiComment}
                    </p>
                  )}
                  {selectedDiaryDetail.sentimentScore !== null && (
                    <p className="text-sm text-gray-500">
                      감성 점수: {selectedDiaryDetail.sentimentScore.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 오늘의 프리지아 추천 - 4 종 카테고리별 */}
            {selectedDiaryDetail.emotion && (
              <div className="mt-8 pt-6 border-t-2 border-yellow-100">
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  🌼 {selectedDiaryDetail.emotion} 기분을 위한 추천 콘텐츠
                </h3>

                {recommendationsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                      <p className="text-gray-500 text-sm">추천 콘텐츠를 준비 중이에요...</p>
                    </div>
                  </div>
                ) : Object.values(groupedRecommendations).every(arr => arr.length === 0) ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">추천 콘텐츠를 준비 중이에요 😊</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 음악 추천 - 분홍색 (#fee2e2) */}
                    {groupedRecommendations.MUSIC.length > 0 && (
                      <div className="bg-[#fee2e2] rounded-xl p-4 border border-pink-200">
                        <h4 className="text-sm font-bold text-pink-700 mb-3 flex items-center gap-2">
                          <span>🎵</span> 음악
                        </h4>
                        <div className="space-y-2">
                          {groupedRecommendations.MUSIC.map((rec) => (
                            <a
                              key={rec.id}
                              href={rec.contentUrl || '#'}
                              target={rec.contentUrl ? '_blank' : undefined}
                              rel="noopener noreferrer"
                              className="block bg-white rounded-lg p-3 hover:shadow-md transition-shadow"
                            >
                              <h5 className="text-sm font-semibold text-gray-800 mb-1 line-clamp-1">
                                {rec.title}
                              </h5>
                              <p className="text-xs text-gray-500 line-clamp-2">
                                {rec.description}
                              </p>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 영화 추천 - 보라색 (#ebe2ff) */}
                    {groupedRecommendations.MOVIE.length > 0 && (
                      <div className="bg-[#ebe2ff] rounded-xl p-4 border border-purple-200">
                        <h4 className="text-sm font-bold text-purple-700 mb-3 flex items-center gap-2">
                          <span>🎬</span> 영화
                        </h4>
                        <div className="space-y-2">
                          {groupedRecommendations.MOVIE.map((rec) => (
                            <a
                              key={rec.id}
                              href={rec.contentUrl || '#'}
                              target={rec.contentUrl ? '_blank' : undefined}
                              rel="noopener noreferrer"
                              className="block bg-white rounded-lg p-3 hover:shadow-md transition-shadow"
                            >
                              <h5 className="text-sm font-semibold text-gray-800 mb-1 line-clamp-1">
                                {rec.title}
                              </h5>
                              <p className="text-xs text-gray-500 line-clamp-2">
                                {rec.description}
                              </p>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 책 추천 - 파란색 (#dbeafe) */}
                    {groupedRecommendations.BOOK.length > 0 && (
                      <div className="bg-[#dbeafe] rounded-xl p-4 border border-blue-200">
                        <h4 className="text-sm font-bold text-blue-700 mb-3 flex items-center gap-2">
                          <span>📚</span> 책
                        </h4>
                        <div className="space-y-2">
                          {groupedRecommendations.BOOK.map((rec) => (
                            <a
                              key={rec.id}
                              href={rec.contentUrl || '#'}
                              target={rec.contentUrl ? '_blank' : undefined}
                              rel="noopener noreferrer"
                              className="block bg-white rounded-lg p-3 hover:shadow-md transition-shadow"
                            >
                              <h5 className="text-sm font-semibold text-gray-800 mb-1 line-clamp-1">
                                {rec.title}
                              </h5>
                              <p className="text-xs text-gray-500 line-clamp-2">
                                {rec.description}
                              </p>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 활동 추천 - 초록색 (#d1fae5) */}
                    {groupedRecommendations.ACTIVITY.length > 0 && (
                      <div className="bg-[#d1fae5] rounded-xl p-4 border border-green-200">
                        <h4 className="text-sm font-bold text-green-700 mb-3 flex items-center gap-2">
                          <span>🏃</span> 활동
                        </h4>
                        <div className="space-y-2">
                          {groupedRecommendations.ACTIVITY.map((rec) => (
                            <a
                              key={rec.id}
                              href={rec.contentUrl || '#'}
                              target={rec.contentUrl ? '_blank' : undefined}
                              rel="noopener noreferrer"
                              className="block bg-white rounded-lg p-3 hover:shadow-md transition-shadow"
                            >
                              <h5 className="text-sm font-semibold text-gray-800 mb-1 line-clamp-1">
                                {rec.title}
                              </h5>
                              <p className="text-xs text-gray-500 line-clamp-2">
                                {rec.description}
                              </p>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 닫기 버튼 */}
            <button
              onClick={closeDetailModal}
              className="w-full py-3 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-white font-semibold transition-colors duration-200 mt-6"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 애니메이션 스타일 - !important 로 강제 적용 */}
      <style>{`
        @keyframes bounce-short {
          0%, 100% { transform: translateY(0) !important; }
          50% { transform: translateY(-3px) !important; }
        }
        .animate-bounce-short {
          animation: bounce-short 0.5s ease-in-out !important;
        }
        @keyframes fade-in {
          from { opacity: 0 !important; }
          to { opacity: 1 !important; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out !important;
        }
        @keyframes scale-in {
          from { transform: scale(0.9) !important; opacity: 0 !important; }
          to { transform: scale(1) !important; opacity: 1 !important; }
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out !important;
        }
        /* 감정 이모지 강제 스타일 - 연필 아이콘 제거 */
        .day-emoji {
          position: absolute !important;
          bottom: 8px !important;
          right: 8px !important;
          font-size: 20px !important;
          line-height: 1 !important;
          z-index: 10 !important;
        }
      `}</style>
    </section>
  );
}