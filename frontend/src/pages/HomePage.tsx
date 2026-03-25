import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { createDiary, getMyDiaries, updateDiary, deleteDiary } from '../api/diary';
import type { DiaryResponse } from '../api/diary';
import DiaryStatsDashboard from '../components/DiaryStatsDashboard';
import EmotionCalendar from '../components/EmotionCalendar';
import Sidebar from '../components/Sidebar';

const EMOTION_EMOJI: Record<string, string> = {
  기쁨: '😊',
  슬픔: '😢',
  분노: '😡',
  불안: '😰',
  중립: '😐',
};

const EMOTION_COLOR: Record<string, string> = {
  기쁨: 'bg-yellow-50 border-yellow-300 text-yellow-700',
  슬픔: 'bg-blue-50 border-blue-300 text-blue-700',
  분노: 'bg-red-50 border-red-300 text-red-700',
  불안: 'bg-violet-50 border-violet-300 text-violet-700',
  중립: 'bg-gray-50 border-gray-300 text-gray-600',
};

// ── AnalysisToast ─────────────────────────────────────────────────────────────

function AnalysisToast({
  emotion,
  score,
  onClose,
}: {
  emotion: string;
  score: number;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const emoji = EMOTION_EMOJI[emotion] ?? '🙂';

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-bounce-once">
      <div className="flex items-center gap-3 bg-white border border-indigo-200 shadow-lg rounded-2xl px-6 py-3">
        <span className="text-2xl">{emoji}</span>
        <div>
          <p className="text-sm font-semibold text-indigo-700">분석 완료!</p>
          <p className="text-sm text-gray-600">
            분석 결과: <span className="font-bold text-indigo-600">{emotion} {emoji}</span>{' '}
            <span className="text-gray-400">(점수: {score})</span>
          </p>
        </div>
        <button onClick={onClose} className="ml-2 text-gray-300 hover:text-gray-500 text-lg leading-none">
          ×
        </button>
      </div>
    </div>
  );
}

// ── DiaryCard ─────────────────────────────────────────────────────────────────

function DiaryCard({
  diary,
  isEditing,
  onEdit,
  onDelete,
}: {
  diary: DiaryResponse;
  isEditing: boolean;
  onEdit: (diary: DiaryResponse) => void;
  onDelete: (id: number) => void;
}) {
  const emotion   = diary.emotion ?? '중립';
  const colorClass = EMOTION_COLOR[emotion] ?? EMOTION_COLOR['중립'];
  const emoji     = EMOTION_EMOJI[emotion] ?? '🙂';

  const dateLabel = new Date(diary.date).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  });

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border transition-shadow p-5 ${
        isEditing
          ? 'border-indigo-300 ring-2 ring-indigo-200 shadow-md'
          : 'border-purple-100 hover:shadow-md'
      }`}
    >
      {/* 카드 헤더: 날짜 / 감정배지 / 수정·삭제 버튼 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-medium text-gray-400 flex-1">{dateLabel}</span>

        {diary.emotion && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0 ${colorClass}`}>
            {emoji} {emotion}
            {diary.sentimentScore != null && (
              <span className="ml-1 opacity-70">({diary.sentimentScore})</span>
            )}
          </span>
        )}

        {/* 수정 버튼 */}
        <button
          onClick={() => onEdit(diary)}
          title="수정"
          className={`shrink-0 text-xs px-2 py-1 rounded-lg border transition-colors ${
            isEditing
              ? 'border-indigo-300 bg-indigo-50 text-indigo-600 font-semibold'
              : 'border-gray-200 text-gray-400 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600'
          }`}
        >
          ✏️ 수정
        </button>

        {/* 삭제 버튼 */}
        <button
          onClick={() => onDelete(diary.id)}
          title="삭제"
          className="shrink-0 text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-400 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-500 transition-colors"
        >
          🗑 삭제
        </button>
      </div>

      <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{diary.content}</p>

      {/* AI 위로 답장 */}
      {diary.aiComment && (
        <div className="mt-3 flex items-start gap-2 bg-violet-50 border border-violet-100 rounded-xl px-4 py-3">
          <span className="text-base shrink-0 mt-0.5">🌸</span>
          <div>
            <p className="text-xs font-semibold text-violet-500 mb-1">프리지아의 답장</p>
            <p className="text-sm text-violet-700 leading-relaxed">{diary.aiComment}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── HomePage ──────────────────────────────────────────────────────────────────

export default function HomePage() {
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();
  const formRef = useRef<HTMLElement>(null);

  const [content,      setContent]      = useState('');
  const [saving,       setSaving]        = useState(false);
  const [diaries,      setDiaries]       = useState<DiaryResponse[]>([]);
  const [loadingList,  setLoadingList]   = useState(true);
  const [toast,        setToast]         = useState<{ emotion: string; score: number } | null>(null);
  const [editingDiary, setEditingDiary]  = useState<DiaryResponse | null>(null);
  const [statsKey,     setStatsKey]      = useState(0);

  const today = new Date().toISOString().split('T')[0];

  const sort = (list: DiaryResponse[]) =>
    [...list].sort((a, b) => b.date.localeCompare(a.date));

  const fetchDiaries = useCallback(async () => {
    try {
      const list = await getMyDiaries();
      setDiaries(sort(list));
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { fetchDiaries(); }, [fetchDiaries]);

  // ── 작성 / 수정 공통 핸들러 ────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      if (editingDiary) {
        // 수정 모드: PUT /api/diaries/{id}
        const updated = await updateDiary(editingDiary.id, {
          content: content.trim(),
          date: editingDiary.date,
        });
        setDiaries((prev) => sort(prev.map((d) => (d.id === updated.id ? updated : d))));
        setEditingDiary(null);
        setContent('');
        setStatsKey((k) => k + 1);
      } else {
        // 작성 모드: POST /api/diaries
        const result = await createDiary({ content: content.trim(), date: today });
        setContent('');
        if (result.emotion && result.sentimentScore != null) {
          setToast({ emotion: result.emotion, score: result.sentimentScore });
        }
        await fetchDiaries();
        setStatsKey((k) => k + 1);
      }
    } finally {
      setSaving(false);
    }
  };

  // ── 수정 시작: 폼에 내용 채우고 스크롤 ────────────────────────────────────

  const handleEdit = (diary: DiaryResponse) => {
    setEditingDiary(diary);
    setContent(diary.content);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCancelEdit = () => {
    setEditingDiary(null);
    setContent('');
  };

  // ── 삭제 ──────────────────────────────────────────────────────────────────

  const handleDelete = async (id: number) => {
    if (!window.confirm('정말 이 일기를 삭제할까요?')) return;
    await deleteDiary(id);
    setDiaries((prev) => prev.filter((d) => d.id !== id));
    // 삭제한 일기가 수정 중이었으면 폼 초기화
    if (editingDiary?.id === id) {
      setEditingDiary(null);
      setContent('');
    }
    setStatsKey((k) => k + 1);
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  // ── 폼 표시용 날짜 라벨 ───────────────────────────────────────────────────

  const formDateLabel = editingDiary
    ? new Date(editingDiary.date).toLocaleDateString('ko-KR', {
        month: 'long', day: 'numeric', weekday: 'short',
      })
    : new Date().toLocaleDateString('ko-KR', {
        month: 'long', day: 'numeric', weekday: 'short',
      });

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <div className="flex-1 ml-64 p-10">
        <div className="min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-indigo-50">
          {toast && (
            <AnalysisToast
              emotion={toast.emotion}
              score={toast.score}
              onClose={() => setToast(null)}
            />
          )}

          {/* 헤더 */}
          <header className="bg-white/70 backdrop-blur border-b border-purple-100 sticky top-0 z-40">
            <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
              <h1 className="text-xl font-bold text-indigo-700">🌸 Freesia</h1>
              <div className="flex items-center gap-3">
                {user && (
                  <span className="text-sm text-gray-500">{user.nickname}님</span>
                )}
                <button
                  onClick={handleLogout}
                  className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  로그아웃
                </button>
              </div>
            </div>
          </header>

          <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
            {/* 감정 통계 대시보드 */}
            <DiaryStatsDashboard refreshKey={statsKey} />

            {/* 감정 달력 */}
            <EmotionCalendar diaries={diaries} />

            {/* 일기 작성 / 수정 폼 */}
            <section
              ref={formRef}
              className={`bg-white rounded-2xl shadow-sm border p-6 transition-colors ${
                editingDiary ? 'border-indigo-300' : 'border-purple-100'
              }`}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">{editingDiary ? '✏️' : '📝'}</span>
                <h2 className="text-base font-semibold text-gray-700">
                  {editingDiary ? '일기 수정' : '오늘의 일기'}
                </h2>
                <span className="ml-auto text-xs text-gray-400">{formDateLabel}</span>
              </div>

              {/* 수정 모드 안내 배너 */}
              {editingDiary && (
                <div className="flex items-center justify-between mb-3 px-3 py-2 bg-indigo-50 rounded-xl text-xs text-indigo-600">
                  <span>✏️ 수정 모드 — 내용을 고치고 수정하기를 눌러주세요.</span>
                  <button
                    onClick={handleCancelEdit}
                    className="ml-2 text-indigo-400 hover:text-indigo-600 font-medium"
                  >
                    취소
                  </button>
                </div>
              )}

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="오늘 하루는 어땠나요? 자유롭게 적어보세요..."
                rows={5}
                className={`w-full resize-none rounded-xl border px-4 py-3 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:border-transparent leading-relaxed ${
                  editingDiary
                    ? 'border-indigo-200 bg-indigo-50/30 focus:ring-indigo-300'
                    : 'border-gray-200 bg-rose-50/40 focus:ring-indigo-300'
                }`}
              />

              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-300">{content.length}자</span>
                <div className="flex items-center gap-2">
                  {editingDiary && (
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 border border-gray-200 text-gray-500 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      취소
                    </button>
                  )}
                  <button
                    onClick={handleSubmit}
                    disabled={saving || !content.trim()}
                    className={`px-5 py-2 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 ${
                      editingDiary
                        ? 'bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-200'
                        : 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-200'
                    }`}
                  >
                    {saving
                      ? editingDiary ? '수정 중...' : '분석 중...'
                      : editingDiary ? '수정하기' : '저장하기'}
                  </button>
                </div>
              </div>
            </section>

            {/* 일기 목록 */}
            <section>
              <h2 className="text-base font-semibold text-gray-600 mb-4 flex items-center gap-2">
                <span>📖</span> 나의 일기 목록
                <span className="text-xs font-normal text-gray-400">({diaries.length}개)</span>
              </h2>

              {loadingList ? (
                <div className="text-center text-gray-300 py-12 text-sm">불러오는 중...</div>
              ) : diaries.length === 0 ? (
                <div className="text-center text-gray-300 py-16">
                  <p className="text-4xl mb-3">🌱</p>
                  <p className="text-sm">아직 작성된 일기가 없어요.</p>
                  <p className="text-sm">오늘의 이야기를 기록해 보세요!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {diaries.map((diary) => (
                    <DiaryCard
                      key={diary.id}
                      diary={diary}
                      isEditing={editingDiary?.id === diary.id}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}