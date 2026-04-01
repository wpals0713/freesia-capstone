import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { createDiary } from '../api/diary';

export default function DiaryWritePage() {
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [message, setMessage] = useState('');

  const handleWriteDiary = async () => {
    if (!content.trim()) {
      setMessage('일기를 입력해주세요! 📝');
      return;
    }

    setIsAnalyzing(true);
    setMessage('');

    try {
      const today = new Date().toISOString().split('T')[0];
      await createDiary({ content: content.trim(), date: today });
      setMessage('일기가 성공적으로 저장되었어요! 🌸');
      
      // 2 초 후 홈으로 이동
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      setMessage('일기 저장 중 오류가 발생했어요. 😭');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex bg-gray-50 min-h-screen">
      {/* 왼쪽 사이드바 */}
      <Sidebar />

      {/* 오른쪽 메인 영역 */}
      <div className="flex-1 ml-64 p-10">
        <div className="min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-indigo-50">
          <div className="max-w-2xl mx-auto px-4 py-8">
            {/* 상단 타이틀 */}
            <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
              🌸 오늘 하루는 어떠셨나요?
            </h1>

            {/* 일기 입력창 */}
            <div className="bg-white rounded-3xl shadow-lg border-2 border-yellow-100 p-6 mb-6">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="오늘의 감정을 자유롭게 적어보세요... 📖"
                rows={12}
                className="w-full resize-none rounded-2xl border-2 border-gray-200 px-6 py-4 text-lg text-gray-700 placeholder-gray-300 focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all duration-300 leading-relaxed"
              />
              
              {/* 문자 수 표시 */}
              <div className="flex items-center justify-between mt-3 px-2">
                <span className="text-sm text-gray-400">
                  {content.length}자
                </span>
                <span className="text-xs text-gray-300">
                  최소 10 자 이상 작성해주세요
                </span>
              </div>
            </div>

            {/* 작성 완료 버튼 */}
            <button
              onClick={handleWriteDiary}
              disabled={isAnalyzing || content.length < 10}
              className="w-full py-4 rounded-2xl bg-yellow-400 hover:bg-yellow-500 text-white text-xl font-bold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl"
            >
              {isAnalyzing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  AI 가 분석 중이에요...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  ✨ AI 에게 감정 분석받기
                </span>
              )}
            </button>

            {/* 메시지 표시 */}
            {message && (
              <div className={`mt-6 p-4 rounded-2xl text-center font-semibold ${
                message.includes('성공') 
                  ? 'bg-green-100 text-green-700' 
                  : message.includes('오류')
                  ? 'bg-red-100 text-red-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {message}
              </div>
            )}

            {/* 홈으로 돌아가기 링크 */}
            <div className="mt-8 text-center">
              <button
                onClick={() => navigate('/')}
                className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
              >
                ← 홈으로 돌아가기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}