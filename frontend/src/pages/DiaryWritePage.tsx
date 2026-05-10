import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { createDiary, chat } from '../api/diary';

interface Message {
  id: number;
  role: 'user' | 'bot';
  content: string;
}

export default function DiaryWritePage() {
  const navigate = useNavigate();
  
  // 일기 모드 상태
  const [content, setContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [diaryMessage, setDiaryMessage] = useState('');

  // 채팅 모드 상태
  const [isChatMode, setIsChatMode] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: 'bot',
      content: "오늘 하루 어땠어? 편하게 이야기해 줘 🌼"
    }
  ]);

  // 일기 작성 핸들러
  const handleWriteDiary = async () => {
    if (!content.trim()) {
      setDiaryMessage('일기를 입력해주세요! 📝');
      return;
    }

    setIsAnalyzing(true);
    setDiaryMessage('');

    try {
      await createDiary({ content: content.trim() });
      setDiaryMessage('일기가 성공적으로 저장되었어요! 🌸');
      
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      setDiaryMessage('일기 저장 중 오류가 발생했어요. 😭');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 채팅 전송 핸들러
  const handleSendMessage = async () => {
    if (!chatInput.trim() || isSending) return;

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: chatInput.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsSending(true);

    try {
      const response = await chat(userMessage.content);
      
      const botMessage: Message = {
        id: Date.now() + 1,
        role: 'bot',
        content: response.reply
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: Date.now() + 1,
        role: 'bot',
        content: "죄송해요, 지금 연결이 안 되고 있어요. 😢"
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  // 엔터키로 전송
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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

            {/* 모드 토글 스위치 */}
            <div className="flex justify-center mb-8">
              <div className="bg-white rounded-full shadow-md p-1 flex">
                <button
                  onClick={() => setIsChatMode(false)}
                  className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                    !isChatMode
                      ? 'bg-yellow-400 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  📝 일기 쓰기
                </button>
                <button
                  onClick={() => setIsChatMode(true)}
                  className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                    isChatMode
                      ? 'bg-yellow-400 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  💬 채팅하기
                </button>
              </div>
            </div>

            {/* 일기 모드 UI */}
            {!isChatMode && (
              <>
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
              </>
            )}

            {/* 채팅 모드 UI */}
            {isChatMode && (
              <>
                {/* 채팅 내역 */}
                <div className="bg-white rounded-3xl shadow-lg border-2 border-yellow-100 p-6 mb-6 h-96 overflow-y-auto">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex mb-4 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-yellow-400 text-white rounded-br-none'
                            : 'bg-gray-100 text-gray-800 rounded-bl-none'
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{message.content}</p>
                      </div>
                    </div>
                  ))}
                  
                  {/* 로딩 중 표시 */}
                  {isSending && (
                    <div className="flex justify-start mb-4">
                      <div className="bg-gray-100 rounded-2xl rounded-bl-none px-4 py-3">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 채팅 입력창 */}
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="메시지를 입력해주세요..."
                    disabled={isSending}
                    className="flex-1 rounded-2xl border-2 border-gray-200 px-4 py-3 text-gray-700 placeholder-gray-300 focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all duration-300 disabled:opacity-50"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isSending || !chatInput.trim()}
                    className="px-6 py-3 rounded-2xl bg-yellow-400 hover:bg-yellow-500 text-white font-semibold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
                  >
                    전송
                  </button>
                </div>
              </>
            )}

            {/* 일기 모드 메시지 표시 */}
            {!isChatMode && diaryMessage && (
              <div className={`mt-6 p-4 rounded-2xl text-center font-semibold ${
                diaryMessage.includes('성공') 
                  ? 'bg-green-100 text-green-700' 
                  : diaryMessage.includes('오류')
                  ? 'bg-red-100 text-red-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {diaryMessage}
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