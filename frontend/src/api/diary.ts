import api from './axios';

export interface DiaryResponse {
  id: number;
  memberId: number;
  content: string;
  emoji: string | null;
  emotion: string | null;
  sentimentScore: number | null;
  aiComment: string | null;
  date: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDiaryRequest {
  content: string;
  emoji?: string;
  date?: string; // 선택적 필드 - 백엔드가 서버 시간으로 자동 설정
}

export interface DiaryCalendarResponse {
  diaryId: number;
  createdAt: string; // YYYY-MM-DD 형식
  emotion: string;
}

export interface DiaryDetailResponse {
  id: number;
  memberId: number;
  content: string;
  emoji: string | null;
  emotion: string | null;
  sentimentScore: number | null;
  aiComment: string | null;
  date: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export const createDiary = async (body: CreateDiaryRequest): Promise<DiaryResponse> => {
  const { data } = await api.post('/diaries', body);
  return data.data;
};

export const getMyDiaries = async (): Promise<DiaryResponse[]> => {
  const { data } = await api.get('/diaries');
  return data.data;
};

export const getCalendarDiaries = async (memberId: number, year: number, month: number): Promise<DiaryCalendarResponse[]> => {
  const { data } = await api.get('/diaries/calendar', { params: { memberId, year, month } });
  return data.data;
};

export const updateDiary = async (id: number, body: CreateDiaryRequest): Promise<DiaryResponse> => {
  const { data } = await api.put(`/diaries/${id}`, body);
  return data.data;
};

export const deleteDiary = async (id: number): Promise<void> => {
  await api.delete(`/diaries/${id}`);
};

export interface DiaryStatistics {
  totalCount: number;
  averageSentimentScore: number | null;
  emotionCounts: Record<string, number>;
}

export const getDiaryStatistics = async (year: number, month: number): Promise<DiaryStatistics> => {
  const { data } = await api.get('/diaries/statistics', { params: { year, month } });
  return data.data;
};

export const getDiaryDetail = async (diaryId: number): Promise<DiaryDetailResponse> => {
  const { data } = await api.get(`/diaries/${diaryId}`);
  return data.data;
};
