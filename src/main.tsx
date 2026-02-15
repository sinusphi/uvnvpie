import React from 'react';
import ReactDOM from 'react-dom/client';
import { Store } from '@tauri-apps/plugin-store';
import App from './App';
import './styles/tokens.css';
import './styles/app.css';

void Store.load('settings.json');

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
