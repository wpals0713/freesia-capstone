import api from './axios';

export interface RecommendationResponse {
  id: number;
  category: string;
  title: string;
  description: string;
  imageUrl: string;
  contentUrl: string;
}

export const getRecommendations = async (emotion: string): Promise<RecommendationResponse[]> => {
  const { data } = await api.get('/recommendations', { params: { emotion } });
  return data; // 꺼내온 배열 데이터를 그대로 컴포넌트로 전달!
};