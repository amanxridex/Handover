import React, { useMemo, useState } from 'react';
import chatAlice from '../assets/chat-alice.jpg';
import chatBella from '../assets/chat-bella.jpg';
import chatCharlie from '../assets/chat-charlie.jpg';
import chatDavid from '../assets/chat-david.jpg';
import creation3 from '../assets/creation-3.jpg';
import creation6 from '../assets/creation-6.jpg';
import { triggerLightHaptic } from '../utils/nativeBridge';
import { BackTriangleIcon, ChevronDownIcon, MicIcon } from './Icons';

const INITIAL_CHATS = [
  {
    id: 'david',
    shortName: 'David',
    name: 'David Smith',
    time: 'Just Now',
    avatar: chatDavid,
    preview: 'So, are we still going to watch that movie tonight?',
    messages: [
      { id: 'd1', from: 'them', text: 'Hey! What time are we meeting?' },
      {
        id: 'd2',
        from: 'them',
        text: 'So, are we still going to watch that movie tonight?',
      },
    ],
  },
  {
    id: 'charlie',
    shortName: 'Charlie',
    name: 'Charlie Brown',
    time: '12:54 PM',
    avatar: chatCharlie,
    preview: "I can't believe that ending, totally unexpected!",
    messages: [
      {
        id: 'c1',
        from: 'them',
        text: "I can't believe that ending, totally unexpected!",
      },
    ],
  },
  {
    id: 'alice',
    shortName: 'Alice',
    name: 'Alice Johnson',
    time: 'Yesterday',
    avatar: chatAlice,
    preview: 'Hey, did you finish the series I recommended?',
    messages: [
      {
        id: 'a1',
        from: 'them',
        text: 'Hey, did you finish the series I recommended?',
      },
    ],
  },
  {
    id: 'mia',
    shortName: 'Mia',
    name: 'Mia Mitchell',
    time: 'Yesterday',
    avatar: creation3,
    preview: "Don't forget tomorrow starts at 9:00 sharp ⏰",
    messages: [
      {
        id: 'm1',
        from: 'them',
        text: "Don't forget tomorrow starts at 9:00 sharp ⏰",
      },
    ],
  },
  {
    id: 'ivy',
    shortName: 'Ivy',
    name: 'Ivy Harris',
    time: 'Sep, 28',
    avatar: creation6,
    preview: 'This soundtrack is stuck in my head all day 😂',
    messages: [
      {
        id: 'i1',
        from: 'them',
        text: 'This soundtrack is stuck in my head all day 😂',
      },
    ],
  },
  {
    id: 'bella',
    shortName: 'Bella',
    name: 'Bella Nelson',
    time: 'Sep, 26',
    avatar: chatBella,
    preview: "Let's catch up this Friday once you're free!",
    messages: [
      {
        id: 'b1',
        from: 'them',
        text: "Let's catch up this Friday once you're free!",
      },
    ],
  },
];

function ChatSearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle
        cx="8"
        cy="8"
        r="5.5"
        stroke="rgba(48, 18, 4, 0.78)"
        strokeWidth="1.8"
      />
      <path
        d="M12.2 12.2L15.8 15.8"
        stroke="rgba(48, 18, 4, 0.78)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function ChatScreen({
  tabs,
  activeTab,
  onSelectTab,
  activeThreadId,
  onOpenThread,
  onCloseThread,
}) {
  const [chats, setChats] = useState(INITIAL_CHATS);
  const [query, setQuery] = useState('');
  const [storiesOpen, setStoriesOpen] = useState(true);
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState('');

  const filteredChats = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.preview.toLowerCase().includes(q)
    );
  }, [chats, query]);

  const activeThread = useMemo(
    () => chats.find((c) => c.id === activeThreadId) || null,
    [chats, activeThreadId]
  );

  const handleSendMessage = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !activeThread) return;
    triggerLightHaptic();
    setChats((prev) =>
      prev.map((c) =>
        c.id === activeThread.id
          ? {
              ...c,
              time: 'Just Now',
              preview: text,
              messages: [
                ...c.messages,
                { id: `me-${Date.now()}`, from: 'me', text },
              ],
            }
          : c
      )
    );
    setDraft('');
  };

  if (activeThread) {
    return (
      <section className="chat-thread-screen" aria-label={`Chat with ${activeThread.name}`}>
        <header className="chat-thread-header">
          <button
            type="button"
            className="back-btn top-back-btn"
            onClick={() => {
              triggerLightHaptic();
              onCloseThread();
            }}
            aria-label="Back to chats"
          >
            <BackTriangleIcon />
          </button>

          <img
            src={activeThread.avatar}
            alt={activeThread.name}
            className="chat-thread-avatar"
          />

          <div className="chat-thread-meta">
            <div className="chat-thread-name">{activeThread.name}</div>
            <div className="chat-thread-sub">Active now</div>
          </div>
        </header>

        <div className="chat-thread-messages">
          {activeThread.messages.map((msg) => (
            <div
              key={msg.id}
              className={`chat-bubble ${msg.from === 'me' ? 'me' : 'them'}`}
            >
              {msg.text}
            </div>
          ))}
        </div>

        <form className="chat-thread-composer" onSubmit={handleSendMessage}>
          <input
            type="text"
            className="chat-thread-input"
            placeholder={`Message ${activeThread.shortName}...`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="submit" className="chat-send-btn">
            Send
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="chat-screen" aria-label="Chats">
      <div className="chat-scroll">
        {/* Top Warm Amber-Orange Card */}
        <div className="chat-hero-card">
          <div className="chat-search-row">
            <label className="chat-search-pill" aria-label="Search chats">
              <ChatSearchIcon />
              <input
                type="search"
                className="chat-search-input"
                placeholder="Search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <MicIcon />
            </label>

            <button
              type="button"
              className={`chat-collapse-btn ${storiesOpen ? '' : 'rotated'}`}
              onClick={() => {
                triggerLightHaptic();
                setStoriesOpen((prev) => !prev);
              }}
              aria-label="Toggle quick contacts"
              aria-expanded={storiesOpen}
            >
              <ChevronDownIcon />
            </button>
          </div>

          <h1 className="chat-hero-title">
            <span className="chat-hero-gold">Let&apos;s Stay</span>
            <br />
            Connected
          </h1>

          {storiesOpen && (
            <div className="chat-contacts-row" aria-label="Quick contacts">
              <button
                type="button"
                className="chat-contact-item"
                onClick={() => {
                  triggerLightHaptic();
                  setNotice('Invite a friend to Handover');
                  setTimeout(() => setNotice(''), 1800);
                }}
              >
                <span className="chat-add-circle">
                  <span className="chat-add-dashed">+</span>
                </span>
                <span className="chat-contact-name">Add</span>
              </button>

              {chats.slice(0, 4).map((person) => (
                <button
                  key={person.id}
                  type="button"
                  className="chat-contact-item"
                  onClick={() => {
                    triggerLightHaptic();
                    onOpenThread(person.id);
                  }}
                >
                  <img
                    src={person.avatar}
                    alt={person.shortName}
                    className="chat-contact-avatar"
                  />
                  <span className="chat-contact-name">{person.shortName}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Conversation List */}
        <div className="chat-list" role="list">
          {filteredChats.map((chat) => (
            <button
              key={chat.id}
              type="button"
              role="listitem"
              className="chat-row"
              onClick={() => {
                triggerLightHaptic();
                onOpenThread(chat.id);
              }}
            >
              <img
                src={chat.avatar}
                alt={chat.name}
                className="chat-row-avatar"
              />
              <div className="chat-row-body">
                <div className="chat-row-top">
                  <span className="chat-row-name">{chat.name}</span>
                  <span className="chat-row-time">{chat.time}</span>
                </div>
                <p className="chat-row-preview">{chat.preview}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Floating Dark Glass Bottom Nav */}
      <div className="chat-bottom-fade" aria-hidden="true" />
      <div className="bottom-nav-wrap feed-bottom-nav-wrap">
        <nav className="bottom-nav chat-bottom-nav" aria-label="Primary navigation">
          {tabs.map(({ id, label, Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                className={`nav-item feed-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectTab(id)}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon active={isActive} dark />
                <span className="nav-label">{label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {notice && (
        <div className="feed-toast" role="status">
          {notice}
        </div>
      )}
    </section>
  );
}
