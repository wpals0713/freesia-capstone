import api from './axios';

export interface RecommendationResponse {
  id: number;
  category: string;
  title: string;
  description: string;
  imageUrl: string;
  contentUrl: string;
}

export interface FeedbackRequest {
  isDisliked: boolean;
}

export const getRecommendations = async (emotion: string): Promise<RecommendationResponse[]> => {
  const { data } = await api.get('/recommendations', { params: { emotion } });
  return data;
};

export const sendFeedback = async (recommendationId: number, isDisliked: boolean): Promise<void> => {
  await api.post(`/recommendations/${recommendationId}/feedback`, { isDisliked } as FeedbackRequest);
};