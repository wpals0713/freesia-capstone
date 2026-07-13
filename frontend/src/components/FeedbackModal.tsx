import { useState } from 'react';
import { sendFeedback } from '../api/recommendation';
import './FeedbackModal.css';

export interface RecommendationItem {
    id: number;
    category: string;
    title: string;
    description: string;
    imageUrl?: string;
    contentUrl: string;
}

interface FeedbackModalProps {
    recommendations: RecommendationItem[];
    isOpen: boolean;
    onClose: () => void;
}

const getCategoryConfig = (category: string) => {
    const config: Record<string, { icon: string; color: string }> = {
        MUSIC: { icon: '🎵', color: '#e91e63' },
        MOVIE: { icon: '🎬', color: '#9c27b0' },
        BOOK: { icon: '📚', color: '#2196f3' },
        ACTIVITY: { icon: '🏃', color: '#4caf50' }
    };
    return config[category] || { icon: '📌', color: '#757575' };
};

export default function FeedbackModal({ recommendations, isOpen, onClose }: FeedbackModalProps) {
    const [dislikedIds, setDislikedIds] = useState<Set<number>>(new Set());

    if (!isOpen || recommendations.length === 0) return null;

    const handleDislike = async (id: number) => {
        try {
            await sendFeedback(id, true);
            setDislikedIds(prev => new Set(prev).add(id));
        } catch (error) {
            console.error('피드백 전송 실패:', error);
        }
    };

    const handleClose = () => {
        onClose();
        setDislikedIds(new Set());
    };

    return (
        <div className="feedback-modal-overlay" onClick={handleClose}>
            <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
                <button className="feedback-modal-close" onClick={handleClose}>×</button>
                
                <div className="feedback-modal-header">
                    <div className="feedback-modal-title">
                        방금 추천해 드린 콘텐츠는 어떠셨나요? 🤔
                    </div>
                    <div className="feedback-modal-subtitle">
                        더 나은 추천을 위해 피드백을 남겨주세요
                    </div>
                </div>

                <div className="feedback-modal-body">
                    {recommendations.map((rec) => {
                        const config = getCategoryConfig(rec.category);
                        const isDisliked = dislikedIds.has(rec.id);

                        return (
                            <div key={rec.id} className={`feedback-item ${isDisliked ? 'disliked' : ''}`}>
                                <div className="feedback-item-icon" style={{ backgroundColor: config.color + '20', color: config.color }}>
                                    {config.icon}
                                </div>
                                <div className="feedback-item-content">
                                    <div className="feedback-item-category">{rec.category}</div>
                                    <div className="feedback-item-title">{rec.title}</div>
                                </div>
                                <button
                                    className={`feedback-item-action ${isDisliked ? 'disliked' : ''}`}
                                    onClick={() => handleDislike(rec.id)}
                                    disabled={isDisliked}
                                >
                                    {isDisliked ? '반영 완료 ✓' : '👎 다시 보지 않기'}
                                </button>
                            </div>
                        );
                    })}
                </div>

                <div className="feedback-modal-footer">
                    <button className="feedback-modal-btn skip" onClick={handleClose}>
                        건너뛰기
                    </button>
                    <button className="feedback-modal-btn primary" onClick={handleClose}>
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
}