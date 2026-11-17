import React, { useEffect, useMemo, useRef, useState } from 'react';
import chatAlice from '../assets/chat-alice.jpg';
import chatBella from '../assets/chat-bella.jpg';
import chatCharlie from '../assets/chat-charlie.jpg';
import chatDavid from '../assets/chat-david.jpg';
import creation3 from '../assets/creation-3.jpg';
import creation6 from '../assets/creation-6.jpg';
import { triggerLightHaptic } from '../utils/nativeBridge';
import BottomNav from './BottomNav';
import {
  BackChevronIcon,
  ChevronDownIcon,
  MicIcon,
  PaperPlaneIcon,
  PhoneIcon,
  UserInfoIcon,
} from './Icons';

const INITIAL_CHATS = [
  {
    id: 'david',
    shortName: 'David',
    name: 'David Smith',
    time: 'Just Now',
    avatar: chatDavid,
    preview: 'So, are we still going to watch that movie tonight?',
    messages: [
      { id: 'd0', from: 'them', text: 'Also, the soundtrack was 🔥🔥🔥', time: '10:10 PM' },
      {
        id: 'd1',
        from: 'me',
        text: '100%!\nI actually added one of the tracks to my playlist right after the movie',
        time: '10:12 PM',
      },
      { id: 'd2', from: 'them', text: 'Same here 🙌', time: '10:13 PM' },
      { id: 'd3', from: 'them', text: 'Been listening to it all morning', time: '10:13 PM' },
      { id: 'd4', from: 'me', text: 'You know what?', time: '10:23 PM' },
      {
        id: 'd5',
        from: 'me',
        text: "If they ever make a sequel, we're going together. No excuses 😉",
        time: '10:24 PM',
      },
      { id: 'd6', from: 'them', text: 'Deal!', time: '10:26 PM' },
      { id: 'd7', from: 'them', text: "And popcorn's on you 😋🍿", time: '10:26 PM' },
      {
        id: 'd8',
        from: 'me',
        text: 'Haha, fine... as long as you bring the drinks!',
        time: '10:28 PM',
      },
      { id: 'd9', from: 'them', text: 'Done ✅', time: '10:31 PM' },
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
      { id: 'c0', from: 'me', text: 'Did you finish watching the finale?', time: '12:51 PM' },
      {
        id: 'c1',
        from: 'them',
        text: "I can't believe that ending, totally unexpected!",
        time: '12:54 PM',
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
        time: '8:15 PM',
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
        time: '6:40 PM',
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
        time: '3:22 PM',
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
        time: '11:05 AM',
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

function formatCurrentTime() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

export default function ChatScreen({
  tabs,
  activeTab,
  onSelectTab,
  activeThreadId,
  onOpenThread,
  onCloseThread,
}) {
  const messagesEndRef = useRef(null);
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

  useEffect(() => {
    if (activeThread) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeThread, activeThread?.messages?.length]);

  const showToast = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 1800);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !activeThread) return;
    triggerLightHaptic();
    const nowTime = formatCurrentTime();
    setChats((prev) =>
      prev.map((c) =>
        c.id === activeThread.id
          ? {
              ...c,
              time: 'Just Now',
              preview: text,
              messages: [
                ...c.messages,
                { id: `me-${Date.now()}`, from: 'me', text, time: nowTime },
              ],
            }
          : c
      )
    );
    setDraft('');
  };

  if (activeThread) {
    const nameParts = activeThread.name.split(' ');
    const firstName = nameParts[0] || activeThread.name;
    const restName = nameParts.slice(1).join(' ');

    return (
      <section
        className="chat-thread-screen screen-stage-view is-push"
        aria-label={`Chat with ${activeThread.name}`}
      >
        {/* Orange Rounded Conversation Container */}
        <div className="chat-thread-surface">
          <div className="chat-thread-header-fade" aria-hidden="true" />

          <header className="chat-thread-header">
            <div className="chat-thread-left">
              <button
                type="button"
                className="chat-thread-back"
                onClick={() => {
                  triggerLightHaptic();
                  onCloseThread();
                }}
                aria-label="Back to chats"
              >
                <BackChevronIcon />
              </button>

              <img
                src={activeThread.avatar}
                alt={activeThread.name}
                className="chat-thread-avatar"
              />

              <div className="chat-thread-title">
                <span className="chat-thread-first">{firstName}</span>
                {restName && <span className="chat-thread-last">{restName}</span>}
              </div>
            </div>

            <div className="chat-thread-actions">
              <button
                type="button"
                className="chat-thread-pill-btn"
                onClick={() => {
                  triggerLightHaptic();
                  showToast(`Calling ${firstName}...`);
                }}
                aria-label={`Call ${activeThread.name}`}
              >
                <PhoneIcon />
              </button>
              <button
                type="button"
                className="chat-thread-pill-btn"
                onClick={() => {
                  triggerLightHaptic();
                  showToast(`${activeThread.name} · Active`);
                }}
                aria-label={`${activeThread.name} info`}
              >
                <UserInfoIcon />
              </button>
            </div>
          </header>

          <div className="chat-thread-messages">
            {activeThread.messages.map((msg) => {
              const isShort = msg.text.length <= 36 && !msg.text.includes('\n');
              return (
                <div
                  key={msg.id}
                  className={`chat-bubble ${msg.from === 'me' ? 'me' : 'them'} ${
                    isShort ? 'inline' : 'stacked'
                  }`}
                >
                  <span className="chat-bubble-text">{msg.text}</span>
                  <span className="chat-bubble-time">{msg.time}</span>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Bottom Dark Composer Dock */}
        <form className="chat-thread-composer" onSubmit={handleSendMessage}>
          <div className="chat-composer-pill">
            <input
              type="text"
              className="chat-thread-input"
              placeholder="Your Message..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button
              type="submit"
              className={`chat-send-btn ${draft.trim() ? 'ready' : ''}`}
              aria-label="Send message"
            >
              <PaperPlaneIcon />
            </button>
          </div>
        </form>

        {notice && (
          <div className="feed-toast" role="status">
            {notice}
          </div>
        )}
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
                  showToast('Invite a friend to Handover');
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

      {/* Floating Solid Black Pill Bottom Nav */}
      <BottomNav
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        dark
        floating
      />

      {notice && (
        <div className="feed-toast" role="status">
          {notice}
        </div>
      )}
    </section>
  );
}
