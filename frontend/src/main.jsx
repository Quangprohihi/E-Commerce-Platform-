import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './style.css';

// #region agent log
const _scrollTo = window.scrollTo;
window.scrollTo = function (xOrOpts, y) {
  const top = typeof xOrOpts === 'object' && xOrOpts !== null ? xOrOpts.top : (typeof y === 'number' ? y : undefined);
  if (typeof top === 'number' && top > 500) fetch('http://127.0.0.1:7933/ingest/7fc5cb31-ce36-41d5-bb88-d82a9d9e1403', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '2e3451' }, body: JSON.stringify({ sessionId: '2e3451', location: 'main.jsx:scrollTo', message: 'scrollTo large y', data: { top, stack: new Error().stack?.slice(0, 400) }, hypothesisId: 'H2', timestamp: Date.now() }) }).catch(() => {});
  return _scrollTo.apply(this, arguments);
};
const _scrollIntoView = Element.prototype.scrollIntoView;
Element.prototype.scrollIntoView = function (arg) {
  const opts = arg && typeof arg === 'object' ? arg : {};
  fetch('http://127.0.0.1:7933/ingest/7fc5cb31-ce36-41d5-bb88-d82a9d9e1403', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '2e3451' }, body: JSON.stringify({ sessionId: '2e3451', location: 'main.jsx:scrollIntoView', message: 'scrollIntoView', data: { tag: this.tagName, id: this.id || null }, hypothesisId: 'H2', timestamp: Date.now() }) }).catch(() => {});
  return _scrollIntoView.apply(this, arguments);
};
// #endregion

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
