import { useState, useEffect } from 'react';
import { getRecommendations, type RecommendationResponse } from '../api/recommendation';

interface RecommendationListProps {
  emotion: string;
}

const CATEGORY_CONFIG: Record<string, { icon: string; color: string }> = {
  MUSIC: { icon: '🎵', color: 'bg-pink-100 text-pink-600' },
  MOVIE: { icon: '🎬', color: 'bg-purple-100 text-purple-600' },
  BOOK: { icon: '📚', color: 'bg-blue-100 text-blue-600' },
  ACTIVITY: { icon: '🏃', color: 'bg-green-100 text-green-600' },
  HOBBY: { icon: '🎨', color: 'bg-yellow-100 text-yellow-600' },
};

const GRADIENT_PLACEHOLDER = 'bg-gradient-to-br from-rose-100 via-purple-100 to-indigo-100';

export default function RecommendationList({ emotion }: RecommendationListProps) {
  const [recommendations, setRecommendations] = useState<RecommendationResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      setIsLoading(true);
      try {
        const data = await getRecommendations(emotion);
        setRecommendations(data);
      } catch (error) {
        console.error('추천 콘텐츠 조회 실패:', error);
        setRecommendations([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [emotion]);

  if (isLoading) {
    return (
      <section className="bg-white rounded-3xl shadow-lg border-2 border-yellow-100 p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">오늘의 프리지아 추천 🌼</h2>
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500">추천 콘텐츠를 불러오는 중이에요...</p>
          </div>
        </div>
      </section>
    );
  }

  if (recommendations.length === 0) {
    return (
      <section className="bg-white rounded-3xl shadow-lg border-2 border-yellow-100 p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">오늘의 프리지아 추천 🌼</h2>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-gray-500 text-lg">아직 추천 콘텐츠가 준비되지 않았어요 😊</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-3xl shadow-lg border-2 border-yellow-100 p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">오늘의 프리지아 추천 🌼</h2>
      
      {/* 감정 표시 */}
      <div className="mb-6">
        <span className="inline-block px-4 py-2 rounded-full bg-yellow-100 text-yellow-700 font-semibold">
          {emotion} 기분을 위한 추천
        </span>
      </div>

      {/* 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recommendations.map((rec) => {
          const categoryConfig = CATEGORY_CONFIG[rec.category] || { icon: '📌', color: 'bg-gray-100 text-gray-600' };
          const hasImage = rec.imageUrl && rec.imageUrl.length > 0;

          return (
            <a
              key={rec.id}
              href={rec.contentUrl || '#'}
              target={rec.contentUrl ? '_blank' : undefined}
              rel="noopener noreferrer"
              className={`
                block rounded-2xl overflow-hidden
                transition-all duration-300 transform hover:scale-105 hover:shadow-xl
                ${!hasImage && !rec.contentUrl ? 'cursor-default hover:scale-100' : 'cursor-pointer'}
              `}
            >
              {/* 이미지 또는 그라데이션 배경 */}
              <div className={`
                ${hasImage ? 'h-48' : 'h-32'}
                ${hasImage ? 'overflow-hidden' : GRADIENT_PLACEHOLDER}
              `}>
                {hasImage ? (
                  <img
                    src={rec.imageUrl}
                    alt={rec.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement?.classList.add(GRADIENT_PLACEHOLDER);
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-4xl opacity-50">{categoryConfig.icon}</span>
                  </div>
                )}
              </div>

              {/* 카드 내용 */}
              <div className="p-5">
                {/* 카테고리 뱃지 */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${categoryConfig.color}`}>
                    {categoryConfig.icon} {rec.category}
                  </span>
                </div>

                {/* 제목 */}
                <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2">
                  {rec.title}
                </h3>

                {/* 설명 */}
                <p className="text-sm text-gray-500 line-clamp-2">
                  {rec.description}
                </p>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}