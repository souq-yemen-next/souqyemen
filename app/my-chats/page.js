'use client';

import Header from '@/components/Header';
import ChatList from '@/components/Chat/ChatList';
import Link from 'next/link';

export default function MyChatsPage() {
  return (
    <>
      <Header />
      <div className="container">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <Link className="btn" href="/">
            ← رجوع
          </Link>
          <span className="badge">💬 محادثاتي</span>
        </div>

        <div style={{ marginTop: 12 }}>
          <ChatList />
        </div>
      </div>
    </>
  );
}
