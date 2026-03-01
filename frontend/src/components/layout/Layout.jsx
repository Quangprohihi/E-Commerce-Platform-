import { useEffect, useState, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import AIChatBox from '../chat/AIChatBox';

export default function Layout() {
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const location = useLocation();
  const prevPathRef = useRef(location.pathname + location.search);

  // Scroll to top on every navigation (category icons, cart, product links, etc.)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname, location.search]);

  // #region agent log
  useEffect(() => {
    const key = location.pathname + location.search;
    if (key === prevPathRef.current) return;
    prevPathRef.current = key;
    const scrollY = window.scrollY ?? window.pageYOffset;
    const docHeight = document.body.scrollHeight;
    const innerHeight = window.innerHeight;
    const hash = location.hash || window.location.hash;
    fetch('http://127.0.0.1:7933/ingest/7fc5cb31-ce36-41d5-bb88-d82a9d9e1403', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '2e3451' }, body: JSON.stringify({ sessionId: '2e3451', location: 'Layout.jsx:nav', message: 'location change', data: { pathname: location.pathname, search: location.search, hash, scrollY, docHeight, innerHeight }, hypothesisId: 'H1,H4', timestamp: Date.now() }) }).catch(() => {});
    requestAnimationFrame(() => {
      const scrollYAfter = window.scrollY ?? window.pageYOffset;
      const activeEl = document.activeElement;
      fetch('http://127.0.0.1:7933/ingest/7fc5cb31-ce36-41d5-bb88-d82a9d9e1403', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '2e3451' }, body: JSON.stringify({ sessionId: '2e3451', location: 'Layout.jsx:rAF', message: 'after rAF', data: { scrollYAfter, docHeight: document.body.scrollHeight, activeTag: activeEl?.tagName, activeId: activeEl?.id ?? null }, hypothesisId: 'H1,H3', timestamp: Date.now() }) }).catch(() => {});
    });
  }, [location.pathname, location.search, location.hash]);
  // #endregion

  useEffect(() => {
    const openChat = () => setAiChatOpen(true);
    window.addEventListener('open-ai-chat', openChat);
    return () => window.removeEventListener('open-ai-chat', openChat);
  }, []);

  return (
    <>
      <Navbar onOpenAIChat={() => setAiChatOpen(true)} />
      <main>
        <Outlet />
      </main>
      <Footer onOpenAIChat={() => setAiChatOpen(true)} />
      <AIChatBox open={aiChatOpen} onClose={() => setAiChatOpen(false)} />
    </>
  );
}
