import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getDiaryStatistics } from '../api/diary';
import type { DiaryStatistics } from '../api/diary';

const EMOTION_EMOJI: Record<string, string> = {
  기쁨: '😊',
  슬픔: '😢',
  분노: '😡',
  중립: '😐',
};

const EMOTION_PIE_COLOR: Record<string, string> = {
  기쁨: '#FCD34D',
  슬픔: '#93C5FD',
  분노: '#FCA5A5',
  중립: '#D1D5DB',
};

const DEFAULT_COLOR = '#C4B5FD';

function renderCustomLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}) {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

function ScoreGauge({ score }: { score: number }) {
  // score 범위: -1 ~ 1 → 0% ~ 100%
  const pct = Math.round(((score + 1) / 2) * 100);
  const color = score >= 0.3 ? '#6366F1' : score >= -0.1 ? '#8B5CF6' : '#F87171';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className="h-2 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs text-gray-400">{score.toFixed(2)} / 1.00</span>
    </div>
  );
}

export default function DiaryStatsDashboard({ refreshKey = 0 }: { refreshKey?: number }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [stats, setStats] = useState<DiaryStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    getDiaryStatistics(year, month)
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [year, month, refreshKey]);

  const monthLabel = `${year}년 ${month}월`;

  if (loading) {
    return (
      <section className="bg-white rounded-2xl shadow-sm border border-purple-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">📊</span>
          <h2 className="text-base font-semibold text-gray-700">이번 달 감정 통계</h2>
          <span className="ml-auto text-xs text-gray-400">{monthLabel}</span>
        </div>
        <div className="text-center text-gray-300 py-10 text-sm">통계를 불러오는 중...</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-white rounded-2xl shadow-sm border border-purple-100 p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">📊</span>
          <h2 className="text-base font-semibold text-gray-700">이번 달 감정 통계</h2>
        </div>
        <p className="text-sm text-gray-400 text-center py-6">통계를 불러오지 못했어요.</p>
      </section>
    );
  }

  const isEmpty = !stats || stats.totalCount === 0;

  if (isEmpty) {
    return (
      <section className="bg-white rounded-2xl shadow-sm border border-purple-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">📊</span>
          <h2 className="text-base font-semibold text-gray-700">이번 달 감정 통계</h2>
          <span className="ml-auto text-xs text-gray-400">{monthLabel}</span>
        </div>
        <div className="text-center py-10">
          <p className="text-3xl mb-3">🌿</p>
          <p className="text-sm text-gray-400">아직 작성된 일기가 없어요.</p>
          <p className="text-sm text-gray-300">일기를 작성하면 감정 통계가 나타나요!</p>
        </div>
      </section>
    );
  }

  const pieData = Object.entries(stats.emotionCounts)
    .filter(([, count]) => count > 0)
    .map(([emotion, count]) => ({
      name: `${EMOTION_EMOJI[emotion] ?? '🙂'} ${emotion}`,
      value: count,
      emotion,
    }));

  const dominantEmotion = pieData.reduce((a, b) => (a.value >= b.value ? a : b), pieData[0]);

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-purple-100 p-6 space-y-5">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <span className="text-lg">📊</span>
        <h2 className="text-base font-semibold text-gray-700">이번 달 감정 통계</h2>
        <span className="ml-auto text-xs text-gray-400">{monthLabel}</span>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-3">
        {/* 총 일기 수 */}
        <div className="flex flex-col items-center justify-center bg-indigo-50 rounded-xl p-3 gap-1">
          <span className="text-2xl font-bold text-indigo-600">{stats.totalCount}</span>
          <span className="text-xs text-indigo-400 font-medium">총 일기 수</span>
        </div>

        {/* 평균 감정 점수 */}
        <div className="flex flex-col items-center justify-center bg-purple-50 rounded-xl p-3 gap-1">
          {stats.averageSentimentScore != null ? (
            <>
              <span className="text-2xl font-bold text-purple-600">
                {stats.averageSentimentScore.toFixed(2)}
              </span>
              <span className="text-xs text-purple-400 font-medium">평균 감정 점수</span>
            </>
          ) : (
            <>
              <span className="text-2xl font-bold text-purple-300">-</span>
              <span className="text-xs text-purple-300 font-medium">평균 감정 점수</span>
            </>
          )}
        </div>

        {/* 이달의 주요 감정 */}
        <div className="flex flex-col items-center justify-center bg-rose-50 rounded-xl p-3 gap-1">
          <span className="text-2xl">{EMOTION_EMOJI[dominantEmotion.emotion] ?? '🙂'}</span>
          <span className="text-xs text-rose-400 font-medium">주요 감정</span>
        </div>
      </div>

      {/* 감정 점수 게이지 */}
      {stats.averageSentimentScore != null && (
        <div className="px-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 font-medium">감정 지수</span>
            <span className="text-xs text-gray-400">부정 ← → 긍정</span>
          </div>
          <ScoreGauge score={stats.averageSentimentScore} />
        </div>
      )}

      {/* 파이 차트 */}
      <div>
        <p className="text-xs text-gray-400 font-medium mb-2 text-center">감정 분포</p>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="value"
              labelLine={false}
              label={renderCustomLabel}
            >
              {pieData.map((entry) => (
                <Cell
                  key={entry.emotion}
                  fill={EMOTION_PIE_COLOR[entry.emotion] ?? DEFAULT_COLOR}
                  stroke="white"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [`${value}회`, name]}
              contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '13px' }}
            />
            <Legend
              iconType="circle"
              iconSize={10}
              formatter={(value) => <span style={{ fontSize: '12px', color: '#6B7280' }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
