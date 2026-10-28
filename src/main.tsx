import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './course.css';
import './student.css';
import './landing.css';
import './account.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
