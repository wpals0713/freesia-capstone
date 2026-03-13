import { useState } from 'react';
import {
  startOfMonth,
  getDaysInMonth,
  getDay,
  format,
  addMonths,
  subMonths,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import type { DiaryResponse } from '../api/diary';

const EMOTION_EMOJI: Record<string, string> = {
  기쁨: '😊',
  슬픔: '😢',
  분노: '😡',
  불안: '😰',
  중립: '😐',
};

const DOW_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

interface Props {
  diaries: DiaryResponse[];
}

export default function EmotionCalendar({ diaries }: Props) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const today = new Date();

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-indexed

  // 해당 월의 1일 요일(0=일, 6=토)
  const startDow    = getDay(startOfMonth(viewDate));
  const daysInMonth = getDaysInMonth(viewDate);

  // 일기 맵: "YYYY-MM-DD" → emotion
  const diaryMap: Record<string, string> = {};
  diaries.forEach((d) => {
    if (d.emotion && d.date) {
      diaryMap[d.date.slice(0, 10)] = d.emotion;
    }
  });

  // 달력 셀 배열: null=빈칸, number=날짜
  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = format(viewDate, 'yyyy년 M월', { locale: ko });

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-purple-100 p-6">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-5">
        <span className="text-lg">📅</span>
        <h2 className="text-base font-semibold text-gray-700">감정 달력</h2>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => setViewDate((d) => subMonths(d, 1))}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-purple-50 hover:text-indigo-600 transition-colors text-base leading-none"
          >
            ‹
          </button>
          <span className="text-sm text-gray-500 w-[7rem] text-center font-medium">
            {monthLabel}
          </span>
          <button
            onClick={() => setViewDate((d) => addMonths(d, 1))}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-purple-50 hover:text-indigo-600 transition-colors text-base leading-none"
          >
            ›
          </button>
        </div>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-2">
        {DOW_NAMES.map((name, i) => (
          <div
            key={name}
            className={`text-center text-xs font-semibold py-1 ${
              i === 0 ? 'text-rose-400' : i === 6 ? 'text-indigo-400' : 'text-gray-400'
            }`}
          >
            {name}
          </div>
        ))}
      </div>

      {/* 날짜 격자 */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="h-12" />;
          }

          const mm      = String(month + 1).padStart(2, '0');
          const dd      = String(day).padStart(2, '0');
          const dateStr = `${year}-${mm}-${dd}`;

          const isToday =
            today.getFullYear() === year &&
            today.getMonth()    === month &&
            today.getDate()     === day;

          const emotion = diaryMap[dateStr];
          const emoji   = emotion ? (EMOTION_EMOJI[emotion] ?? '🙂') : null;
          const dow     = idx % 7; // 0=일, 6=토

          return (
            <div
              key={dateStr}
              className={`h-12 flex flex-col items-center justify-center rounded-xl transition-colors ${
                isToday
                  ? 'bg-indigo-100 ring-2 ring-indigo-300'
                  : emoji
                  ? 'bg-rose-50 hover:bg-rose-100'
                  : 'hover:bg-gray-50'
              }`}
            >
              {/* 날짜 숫자 */}
              <span
                className={`text-xs leading-none ${
                  isToday
                    ? 'font-extrabold text-indigo-700'
                    : dow === 0
                    ? 'font-medium text-rose-400'
                    : dow === 6
                    ? 'font-medium text-indigo-500'
                    : 'text-gray-600'
                }`}
              >
                {day}
              </span>

              {/* 감정 이모지 도장 */}
              <span className={`text-base leading-none mt-0.5 ${emoji ? '' : 'invisible'}`}>
                {emoji ?? '·'}
              </span>
            </div>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 pt-3 border-t border-gray-100 justify-center">
        {Object.entries(EMOTION_EMOJI).map(([label, emo]) => (
          <span key={label} className="flex items-center gap-1 text-xs text-gray-400">
            <span>{emo}</span>
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}
