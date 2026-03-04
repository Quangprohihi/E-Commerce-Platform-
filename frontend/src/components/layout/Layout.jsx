import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import AIChatBox from '../chat/AIChatBox';

export default function Layout() {
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const location = useLocation();
  const isDashboardRoute = ['/account', '/seller', '/staff', '/admin', '/settings'].some((path) => location.pathname.startsWith(path));

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname, location.search]);

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
      {!isDashboardRoute ? <Footer onOpenAIChat={() => setAiChatOpen(true)} /> : null}
      <AIChatBox open={aiChatOpen} onClose={() => setAiChatOpen(false)} />
    </>
  );
}
