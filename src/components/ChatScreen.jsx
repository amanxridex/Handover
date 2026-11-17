import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import avatarDefault from '../assets/avatar-default.jpg';
import {
  fetchDirectMessages,
  fetchMyDirectThreads,
  isUuid,
  sendDirectMessage,
} from '../services/chatService';
import { subscribeRealtimeChannel } from '../services/realtimeService';
import { triggerLightHaptic } from '../utils/nativeBridge';
import BottomNav from './BottomNav';
import {
  BackChevronIcon,
  ChevronDownIcon,
  PaperPlaneIcon,
  UserInfoIcon,
} from './Icons';

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
  currentUserId = '',
  activeThreadId,
  activePeer = null,
  onOpenThread,
  onCloseThread,
  onOpenProfile,
}) {
  const messagesEndRef = useRef(null);
  const [chats, setChats] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [query, setQuery] = useState('');
  const [storiesOpen, setStoriesOpen] = useState(true);
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState('');

  const refreshThreads = useCallback(async () => {
    const dbThreads = await fetchMyDirectThreads();
    setLoadingThreads(false);
    if (!Array.isArray(dbThreads)) return;

    setChats((prev) => {
      const prevById = new Map(prev.map((p) => [p.id, p]));
      const dbIds = new Set(dbThreads.map((t) => t.id));
      const normalizedDb = dbThreads.map((t) => {
        const existing = prevById.get(t.id);
        return {
          ...t,
          avatar: t.avatar || avatarDefault,
          messages: existing?.messages || [],
        };
      });

      // Keep unsent activePeer at top if user just navigated via "Message" button
      const unsentPeer =
        activePeer?.id && !dbIds.has(activePeer.id)
          ? prevById.get(activePeer.id) || {
              id: activePeer.id,
              shortName:
                (activePeer.fullName || activePeer.name || 'Member').split(' ')[0],
              name: activePeer.fullName || activePeer.name || 'Handover Member',
              username: activePeer.username || '',
              time: 'New chat',
              avatar: activePeer.avatar || avatarDefault,
              preview: 'Start a conversation',
              isDbThread: true,
              messages: [],
            }
          : null;

      return unsentPeer ? [unsentPeer, ...normalizedDb] : normalizedDb;
    });
  }, [activePeer]);

  const loadActiveMessages = useCallback(async () => {
    if (!activeThreadId || !isUuid(activeThreadId)) return;
    const res = await fetchDirectMessages(activeThreadId);
    if (!res) return;

    setChats((prev) => {
      const exists = prev.some((c) => c.id === activeThreadId);
      const peerName =
        res.peer?.name ||
        activePeer?.fullName ||
        activePeer?.name ||
        'Handover Member';
      const lastMsg =
        res.messages.length > 0
          ? res.messages[res.messages.length - 1]
          : null;

      if (!exists) {
        return [
          {
            id: activeThreadId,
            shortName: peerName.split(' ')[0] || peerName,
            name: peerName,
            username: res.peer?.username || activePeer?.username || '',
            avatar: res.peer?.avatar || activePeer?.avatar || avatarDefault,
            time: lastMsg?.time || 'New chat',
            preview: lastMsg?.text || 'Start a conversation',
            isDbThread: true,
            messages: res.messages,
          },
          ...prev,
        ];
      }

      return prev.map((c) =>
        c.id === activeThreadId
          ? {
              ...c,
              name: res.peer?.name || c.name,
              shortName: res.peer?.shortName || c.shortName,
              username: res.peer?.username || c.username || '',
              avatar: res.peer?.avatar || c.avatar || avatarDefault,
              preview: lastMsg?.text || c.preview,
              time: lastMsg?.time || c.time,
              messages: res.messages,
            }
          : c
      );
    });
  }, [activeThreadId, activePeer]);

  // Initial load + DB sync when user switches or peer opens
  useEffect(() => {
    refreshThreads();
  }, [currentUserId, refreshThreads]);

  // Ensure an activePeer tapped from Search/Profile exists in thread list even before 1st message
  useEffect(() => {
    if (!activeThreadId || !activePeer || activePeer.id !== activeThreadId) {
      return;
    }
    setChats((prev) => {
      if (prev.some((c) => c.id === activePeer.id)) return prev;
      const peerName = activePeer.fullName || activePeer.name || 'Member';
      return [
        {
          id: activePeer.id,
          shortName: peerName.split(' ')[0] || peerName,
          name: peerName,
          username: activePeer.username || '',
          time: 'New chat',
          avatar: activePeer.avatar || avatarDefault,
          preview: 'Start a conversation',
          isDbThread: true,
          messages: [],
        },
        ...prev,
      ];
    });
  }, [activeThreadId, activePeer]);

  // Load live messages for open thread + subscribe to real-time broadcasts + backup poll
  useEffect(() => {
    loadActiveMessages();
  }, [loadActiveMessages]);

  useEffect(() => {
    const syncAll = () => {
      refreshThreads();
      if (activeThreadId && isUuid(activeThreadId)) {
        loadActiveMessages();
      }
    };

    const unsubscribe = currentUserId
      ? subscribeRealtimeChannel(`dm:${currentUserId}`, 'new_dm', syncAll)
      : () => {};

    const timer = setInterval(syncAll, 3500);
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [currentUserId, activeThreadId, refreshThreads, loadActiveMessages]);

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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !activeThread) return;
    triggerLightHaptic();
    const nowTime = formatCurrentTime();
    const tempId = `me-${Date.now()}`;
    setDraft('');

    setChats((prev) =>
      prev.map((c) =>
        c.id === activeThread.id
          ? {
              ...c,
              time: 'Just Now',
              preview: text,
              messages: [
                ...c.messages,
                { id: tempId, from: 'me', text, time: nowTime },
              ],
            }
          : c
      )
    );

    if (isUuid(activeThread.id)) {
      const res = await sendDirectMessage(activeThread.id, text);
      if (res.ok && res.message) {
        setChats((prev) =>
          prev.map((c) =>
            c.id === activeThread.id
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === tempId ? res.message : m
                  ),
                }
              : c
          )
        );
      } else {
        showToast(res.error || 'Could not send message');
      }
    }
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
                  if (activeThread.username && onOpenProfile) {
                    onOpenProfile(activeThread.username);
                  } else {
                    showToast(`${activeThread.name} · Active`);
                  }
                }}
                aria-label={`${activeThread.name} profile`}
              >
                <UserInfoIcon />
              </button>
            </div>
          </header>

          <div className="chat-thread-messages">
            {activeThread.messages.length === 0 && (
              <div className="profile-empty-state" style={{ marginTop: 48 }}>
                <span className="profile-empty-title" style={{ color: '#fff' }}>
                  Say hi to {activeThread.shortName}
                </span>
                <p className="profile-empty-sub" style={{ color: 'rgba(255,255,255,0.82)' }}>
                  Messages you send here are saved and delivered in real time.
                </p>
              </div>
            )}
            {activeThread.messages.map((msg) => {
              const isShort = msg.text.length <= 36 && !msg.text.includes('\n');
              return (
                <div
                  key={msg.id}
                  className={`chat-bubble ${msg.from === 'me' ? 'me' : 'them'} ${isShort ? 'inline' : 'stacked'
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
                  onSelectTab('search');
                }}
              >
                <span className="chat-add-circle">
                  <span className="chat-add-dashed">+</span>
                </span>
                <span className="chat-contact-name">Find</span>
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
          {loadingThreads && chats.length === 0 ? (
            <div className="profile-empty-state">
              <p className="profile-empty-sub">Loading your conversations...</p>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="profile-empty-state">
              <span className="profile-empty-title">
                {query.trim() ? 'No matching chats' : 'No messages yet'}
              </span>
              <p className="profile-empty-sub">
                {query.trim()
                  ? 'Try searching another name.'
                  : 'Find founders or creators in Search and tap Message to start a live conversation.'}
              </p>
              {!query.trim() && (
                <button
                  type="button"
                  className="profile-empty-cta"
                  onClick={() => {
                    triggerLightHaptic();
                    onSelectTab('search');
                  }}
                >
                  Find people
                </button>
              )}
            </div>
          ) : (
            filteredChats.map((chat) => (
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
            ))
          )}
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
