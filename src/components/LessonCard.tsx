import React from 'react';
import type { Lesson } from '../types';

interface LessonCardProps {
  lesson: Lesson;
  completed: boolean;
  onOpen: (lessonId: string) => void;
}

export const LessonCard: React.FC<LessonCardProps> = ({ lesson, completed, onOpen }) => (
  <button
    type="button"
    className="lesson-card"
    onClick={() => onOpen(lesson.id)}
  >
    <div className="tag-row">
      <span className="lesson-icon">{lesson.icon}</span>
      <span className={`tag ${completed ? 'green' : 'grey'}`}>
        {completed ? '✓ Ukończona' : 'Do nauki'}
      </span>
    </div>
    <h3>{lesson.title}</h3>
    <p>{lesson.subtitle}</p>
    <div className="tag-row">
      <span className="tag">WYKŁAD {lesson.track}</span>
      <span className="mini muted">Otwórz →</span>
    </div>
  </button>
);