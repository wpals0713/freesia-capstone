import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const Profile = () => {
const [email, setEmail] = useState('');
const [nickname, setNickname] = useState('');
const [newNickname, setNewNickname] = useState('');
const [message, setMessage] = useState('');

  // 1. 화면이 켜질 때 백엔드에서 내 정보(GET) 불러오기
useEffect(() => {
    const fetchProfile = async () => {
    try {
        const token = localStorage.getItem('accessToken'); // 로그인할 때 저장한 JWT 토큰 이름에 맞게 수정하세요!
        
        const response = await fetch('http://localhost:8080/api/members/me', {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        });

        if (response.ok) {
        const data = await response.json();
        setEmail(data.email);
        setNickname(data.nickname);
          setNewNickname(data.nickname); // 인풋창 초기값을 내 닉네임으로 설정
        }
    } catch (error) {
        console.error('정보를 불러오는데 실패했습니다.', error);
    }
    };

    fetchProfile();
}, []);

  // 2. 닉네임 수정(PATCH) 요청 보내기
const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
    const token = localStorage.getItem('accessToken');
    const response = await fetch('http://localhost:8080/api/members/me', {
        method: 'PATCH',
        headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nickname: newNickname }), // DTO 형식에 맞춰 전송
    });

    if (response.ok) {
        setNickname(newNickname);
        setMessage('닉네임이 성공적으로 변경되었습니다! 🎉');
    } else {
        setMessage('닉네임 변경에 실패했습니다. 😭');
    }
    } catch (error) {
    setMessage('서버 통신 중 오류가 발생했습니다.');
    }
};

return (
    <div className="flex bg-gray-50 min-h-screen">
      {/* 왼쪽에 사이드바 고정 */}
    <Sidebar />

      {/* 오른쪽 메인 컨텐츠 영역 (사이드바 너비인 ml-64 만큼 띄워줌) */}
    <div className="flex-1 ml-64 p-10 flex justify-center items-center">
        <div className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-lg border border-yellow-100">
        <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">내 정보 관리</h2>
        
        <div className="mb-6">
            <label className="block text-sm font-bold text-gray-500 mb-2 pl-1">이메일 계정</label>
            <div className="p-4 bg-gray-100 rounded-2xl text-gray-600 font-medium">
            {email || '데이터를 불러오는 중입니다...'}
            </div>
        </div>

        <form onSubmit={handleUpdate}>
            <div className="mb-8">
            <label className="block text-sm font-bold text-gray-500 mb-2 pl-1">닉네임</label>
            <input
                type="text"
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 transition-all font-medium text-gray-800"
                placeholder="새로운 닉네임을 입력하세요"
            />
            </div>
            
            <button
            type="submit"
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-white font-bold py-4 rounded-2xl transition-colors shadow-lg hover:shadow-xl text-lg"
            >
            내 정보 저장하기
            </button>
        </form>

          {/* 성공/실패 메시지 띄우기 */}
        {message && (
            <p className={`mt-6 text-center text-sm font-bold ${message.includes('성공') ? 'text-green-500' : 'text-red-500'}`}>
            {message}
            </p>
        )}
        </div>
    </div>
    </div>
);
};

export default Profile;