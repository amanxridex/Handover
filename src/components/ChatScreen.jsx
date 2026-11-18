import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import avatarDefault from '../assets/avatar-default.jpg';
import {
  fetchDirectMessages,
  fetchMyDirectThreads,
  formatMessageTime,
  getCachedDirectMessages,
  getCachedDirectThreads,
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
  const initialCachedThreads = getCachedDirectThreads();
  const [chats, setChats] = useState(() => {
    const base = initialCachedThreads || [];
    if (activeThreadId && isUuid(activeThreadId)) {
      const cachedMsgs = getCachedDirectMessages(activeThreadId);
      if (cachedMsgs) {
        const exists = base.some((c) => c.id === activeThreadId);
        if (exists) {
          return base.map((c) =>
            c.id === activeThreadId
              ? { ...c, messages: cachedMsgs.messages || c.messages }
              : c
          );
        }
        if (cachedMsgs.peer) {
          return [
            {
              ...cachedMsgs.peer,
              avatar: cachedMsgs.peer.avatar || avatarDefault,
              preview:
                cachedMsgs.messages?.[cachedMsgs.messages.length - 1]?.text || '',
              time:
                cachedMsgs.messages?.[cachedMsgs.messages.length - 1]?.time ||
                'New chat',
              isDbThread: true,
              messages: cachedMsgs.messages || [],
            },
            ...base,
          ];
        }
      }
    }
    return base;
  });
  const [loadingThreads, setLoadingThreads] = useState(!initialCachedThreads);
  const [query, setQuery] = useState('');
  const [storiesOpen, setStoriesOpen] = useState(true);
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState('');
  const [flyingIds, setFlyingIds] = useState(() => new Set());
  const [isLaunching, setIsLaunching] = useState(false);

  const mergeServerWithLocalMessages = (localMsgs = [], serverMsgs = []) => {
    const serverIds = new Set(serverMsgs.map((m) => m.id));
    const unresolvedLocal = (localMsgs || []).filter(
      (m) => (m.pending || m.failed) && !serverIds.has(m.id)
    );
    return unresolvedLocal.length > 0
      ? [...serverMsgs, ...unresolvedLocal]
      : serverMsgs;
  };

  const refreshThreads = useCallback(
    async ({ force = false } = {}) => {
      const dbThreads = await fetchMyDirectThreads({ force });
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
    },
    [activePeer]
  );

  const loadActiveMessages = useCallback(
    async ({ force = false } = {}) => {
      if (!activeThreadId || !isUuid(activeThreadId)) return;
      const res = await fetchDirectMessages(activeThreadId, { force });
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
                messages: mergeServerWithLocalMessages(c.messages, res.messages),
              }
            : c
        );
      });
    },
    [activeThreadId, activePeer]
  );

  // Initial load + DB sync when user switches or peer opens
  useEffect(() => {
    refreshThreads({ force: false });
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

  // Load live messages for open thread + subscribe to real-time broadcasts + calm backup poll
  useEffect(() => {
    loadActiveMessages({ force: false });
  }, [loadActiveMessages]);

  useEffect(() => {
    const syncForced = (payload) => {
      if (
        payload?.id &&
        payload?.senderId &&
        payload.senderId !== currentUserId &&
        payload.text
      ) {
        const incomingMsg = {
          id: payload.id,
          from: 'them',
          text: payload.text,
          time: formatMessageTime(payload.createdAt),
          isIncoming: true,
        };
        setChats((prev) =>
          prev.map((c) => {
            if (c.id !== payload.senderId) return c;
            if (c.messages.some((m) => m.id === payload.id)) return c;
            return {
              ...c,
              time: 'Just Now',
              preview: payload.text,
              messages: [...c.messages, incomingMsg],
            };
          })
        );
      }

      refreshThreads({ force: true });
      if (activeThreadId && isUuid(activeThreadId)) {
        loadActiveMessages({ force: true });
      }
    };

    const unsubscribe = currentUserId
      ? subscribeRealtimeChannel(`dm:${currentUserId}`, 'new_dm', syncForced)
      : () => {};

    const timer = setInterval(() => {
      refreshThreads({ force: true });
      if (activeThreadId && isUuid(activeThreadId)) {
        loadActiveMessages({ force: true });
      }
    }, 8000);
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

  const activeThread = useMemo(() => {
    const found = chats.find((c) => c.id === activeThreadId);
    if (found) return found;
    if (activeThreadId && isUuid(activeThreadId)) {
      const peerName =
        activePeer?.fullName || activePeer?.name || 'Loading conversation';
      return {
        id: activeThreadId,
        shortName: peerName.split(' ')[0] || peerName,
        name: peerName,
        username: activePeer?.username || '',
        avatar: activePeer?.avatar || avatarDefault,
        time: '',
        preview: '',
        isDbThread: true,
        messages: [],
      };
    }
    return null;
  }, [chats, activeThreadId, activePeer]);

  useEffect(() => {
    if (activeThread) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeThread, activeThread?.messages?.length]);

  const showToast = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 1800);
  };

  const deliverMessage = async (threadId, tempId, text) => {
    if (!isUuid(threadId)) return;
    const res = await sendDirectMessage(threadId, text);
    if (res.ok && res.message) {
      setChats((prev) =>
        prev.map((c) =>
          c.id === threadId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === tempId ? { ...res.message, clientKey: tempId } : m
                ),
              }
            : c
        )
      );
    } else {
      setChats((prev) =>
        prev.map((c) =>
          c.id === threadId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === tempId
                    ? { ...m, pending: false, failed: true, clientKey: tempId }
                    : m
                ),
              }
            : c
        )
      );
      showToast(res.error || 'Could not send message · Tap to retry');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !activeThread) return;
    triggerLightHaptic();
    const nowTime = formatCurrentTime();
    const tempId = `me-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const targetId = activeThread.id;
    setDraft('');

    // Trigger launcher impulse and bubble flight from composer
    setIsLaunching(true);
    setFlyingIds((prev) => new Set(prev).add(tempId));
    setTimeout(() => {
      setIsLaunching(false);
    }, 450);
    setTimeout(() => {
      setFlyingIds((prev) => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
    }, 1100);

    setChats((prev) =>
      prev.map((c) =>
        c.id === targetId
          ? {
              ...c,
              time: 'Just Now',
              preview: text,
              messages: [
                ...c.messages,
                {
                  id: tempId,
                  clientKey: tempId,
                  from: 'me',
                  text,
                  time: nowTime,
                  pending: true,
                  failed: false,
                  isFlying: true,
                },
              ],
            }
          : c
      )
    );

    await deliverMessage(targetId, tempId, text);
  };

  const handleRetryMessage = async (msg) => {
    if (!activeThread || !msg?.failed) return;
    triggerLightHaptic();
    const targetId = activeThread.id;
    setChats((prev) =>
      prev.map((c) =>
        c.id === targetId
          ? {
              ...c,
              messages: c.messages.map((m) =>
                m.id === msg.id ? { ...m, pending: true, failed: false } : m
              ),
            }
          : c
      )
    );
    await deliverMessage(targetId, msg.id, msg.text);
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
              const isFlying =
                Boolean(msg.isFlying) ||
                flyingIds.has(msg.id) ||
                Boolean(msg.clientKey && flyingIds.has(msg.clientKey));
              return (
                <div
                  key={msg.clientKey || msg.id}
                  className={`chat-bubble ${msg.from === 'me' ? 'me' : 'them'} ${
                    isShort && !msg.failed ? 'inline' : 'stacked'
                  } ${msg.failed ? 'is-failed' : ''} ${
                    isFlying ? 'is-flying' : ''
                  } ${msg.isIncoming ? 'is-incoming' : ''}`}
                  onClick={msg.failed ? () => handleRetryMessage(msg) : undefined}
                >
                  <span className="chat-bubble-text">{msg.text}</span>
                  <span className="chat-bubble-time">
                    {msg.failed ? 'Not sent · Tap to retry' : msg.time}
                  </span>
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
              className={`chat-send-btn ${draft.trim() ? 'ready' : ''} ${
                isLaunching ? 'is-launching' : ''
              }`}
              aria-label="Send message"
            >
              <span className="chat-send-icon-wrap">
                <PaperPlaneIcon />
              </span>
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
