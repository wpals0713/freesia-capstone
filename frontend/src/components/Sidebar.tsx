import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
const location = useLocation();

  // 프리지아의 메뉴 리스트
const menuItems = [
    { path: '/write', label: '📝 오늘의 일기' },
    { path: '/calendar', label: '📅 감정 달력' },
    { path: '/profile', label: '👤 내 정보' },
];

return (
    <div className="w-64 h-screen bg-yellow-50 fixed left-0 top-0 shadow-lg p-6 flex flex-col">
      {/* 로고 부분 */}
    <div className="text-3xl font-extrabold text-yellow-500 mb-10 text-center tracking-tight">
        🌼 Freesia
    </div>

      {/* 메뉴 네비게이션 */}
    <nav className="flex flex-col gap-3">
        {menuItems.map((item) => (
        <Link
            key={item.path}
            to={item.path}
            className={`p-4 rounded-2xl transition-all duration-200 font-medium ${
            location.pathname === item.path
                ? 'bg-yellow-400 text-white shadow-md' // 현재 선택된 메뉴
                : 'text-gray-600 hover:bg-yellow-200 hover:text-yellow-800' // 선택되지 않은 메뉴
            }`}
        >
            {item.label}
        </Link>
        ))}
    </nav>

      {/* 하단 로그아웃 버튼 */}
    <div className="mt-auto">
        <button 
        className="w-full p-4 text-red-400 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-colors font-medium"
        onClick={() => alert('로그아웃 로직을 연결할 예정입니다!')}
        >
        로그아웃
        </button>
    </div>
    </div>
);
};

export default Sidebar;