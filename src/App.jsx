import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import avatarDefault from './assets/avatar-default.jpg';
import avatarJacob from './assets/avatar-jacob.jpg';
import chatAlice from './assets/chat-alice.jpg';
import chatCharlie from './assets/chat-charlie.jpg';
import chatDavid from './assets/chat-david.jpg';
import creation3 from './assets/creation-3.jpg';
import creation5 from './assets/creation-5.jpg';
import feedPillowFight from './assets/feed-pillow-fight.jpg';
import feedWarmPost from './assets/feed-warm-post.jpg';
import heroCollage from './assets/hero-collage.png';
import profileHero from './assets/profile-hero.jpg';
import {
  BackTriangleIcon,
  ChatTabIcon,
  HomeTabIcon,
  ProfileTabIcon,
  SearchIcon,
  SearchTabIcon,
} from './components/Icons';
import {
  PROMO_BY_CATEGORY,
  USER_PROFILES,
} from './data/brandsData';
import ChatScreen from './components/ChatScreen';
import BottomNav from './components/BottomNav';
import BrandDealDetailScreen from './components/BrandDealDetailScreen';
import BrandDealsScreen from './components/BrandDealsScreen';
import CreateBrandDealScreen from './components/CreateBrandDealScreen';
import CreatePostScreen from './components/CreatePostScreen';
import CreatorsScreen from './components/CreatorsScreen';
import FoundersScreen from './components/FoundersScreen';
import HomeFeedScreen from './components/HomeFeedScreen';
import NotificationsScreen from './components/NotificationsScreen';
import OnboardingScreen from './components/OnboardingScreen';
import PasscodeLockScreen from './components/PasscodeLockScreen';
import ProfileScreen from './components/ProfileScreen';
import ProfileSetupScreen from './components/ProfileSetupScreen';
import RoleOnboardingFlow from './components/RoleOnboardingFlow';
import SettingsScreen from './components/SettingsScreen';
import SignInScreen from './components/SignInScreen';
import SplashScreen from './components/SplashScreen';
import {
  clearStoredOnboardingState,
  getStoredOnboardingState,
  persistLocalProfile,
  saveOnboardedProfile,
  searchProfilesByName,
  syncProfileFromSupabase,
} from './services/profileService';
import {
  clearStoredSettings,
  DEFAULT_SETTINGS,
  fetchUserSettings,
  getStoredSettings,
  saveUserSettings,
} from './services/settingsService';
import { triggerLightHaptic } from './utils/nativeBridge';

const INITIAL_NOTIFICATIONS = [
  {
    id: 'n1',
    type: 'follow',
    actor: 'Olivia Beits',
    avatar: profileHero,
    time: '2m ago',
    unread: true,
    followingBack: false,
  },
  {
    id: 'n2',
    type: 'like',
    actor: '@Maria Theodor',
    avatar: creation5,
    time: '4m ago',
    unread: true,
    postTitle: 'Check out my pillow fight with beautiful views',
    postThumb: feedPillowFight,
  },
  {
    id: 'n3',
    type: 'comment',
    actor: '@Alice Johnson',
    avatar: chatAlice,
    time: '12m ago',
    unread: true,
    comment: 'Those twilight colors are unreal 🔥',
    postThumb: feedWarmPost,
  },
  {
    id: 'n4',
    type: 'follow',
    actor: 'David Smith',
    avatar: chatDavid,
    time: '24m ago',
    unread: true,
    followingBack: false,
  },
  {
    id: 'n5',
    type: 'like',
    actor: '@Charlie Brown',
    avatar: chatCharlie,
    time: '38m ago',
    unread: true,
    postTitle: 'Golden hour above the skyline',
    postThumb: feedWarmPost,
  },
  {
    id: 'n6',
    type: 'comment',
    actor: '@Jacob Jones',
    avatar: avatarJacob,
    time: '2h ago',
    unread: true,
    comment: 'Need this exact camera preset!',
    postThumb: creation3,
  },
];

const TABS = [
  { id: 'home', label: 'Home', Icon: HomeTabIcon },
  { id: 'chat', label: 'Chat', Icon: ChatTabIcon },
  { id: 'search', label: 'Search', Icon: SearchTabIcon },
  { id: 'profile', label: 'Profile', Icon: ProfileTabIcon },
];

const TAB_ORDER = { home: 0, chat: 1, search: 2, profile: 3 };

function routeForSnapshot(snap) {
  if (!snap || snap.flowStep === 'onboarding') return '/auth';
  if (snap.flowStep === 'signin') return '/signin';
  if (snap.flowStep === 'setup') return '/onboarding/profile';
  if (snap.flowStep === 'role') {
    if (snap.roleSubStep === 'founder-1') return '/onboarding/founder';
    if (snap.roleSubStep === 'founder-2') return '/onboarding/founder/details';
    if (snap.roleSubStep === 'creator-1') return '/onboarding/creator';
    return '/onboarding/role';
  }
  if (snap.activeTab === 'home') {
    if (snap.createPage === 'post') return '/create-post';
    if (snap.createPage === 'deal') return '/create-deal';
    if (snap.foundersOpen) return '/founders';
    if (snap.creatorsOpen) return '/creators';
    if (snap.notificationsOpen) return '/notifications';
    if (snap.activeCommentsPostId) {
      return `/post/${snap.activeCommentsPostId}/comments`;
    }
    return '/home';
  }
  if (snap.activeTab === 'chat') {
    return snap.activeChatId ? `/chat/${snap.activeChatId}` : '/chat';
  }
  if (snap.activeTab === 'search') {
    if (snap.viewedUsername) {
      return `/u/${snap.viewedUsername}`;
    }
    if (snap.brandDealsOpen && snap.selectedDealId) {
      return `/deals/${snap.selectedDealId}`;
    }
    return snap.brandDealsOpen ? '/deals' : '/search';
  }
  if (snap.activeTab === 'profile') {
    return snap.settingsOpen ? '/settings' : '/profile';
  }
  return '/home';
}

function snapshotFromPathname(pathname, alreadyOnboarded) {
  const path = (pathname || '/').replace(/\/+$/, '') || '/';
  const base = {
    flowStep: alreadyOnboarded ? 'main' : 'onboarding',
    roleSubStep: 'role',
    activeTab: 'home',
    brandDealsOpen: false,
    selectedDealId: null,
    viewedUsername: null,
    hasPostModal: false,
    activeChatId: null,
    activeCommentsPostId: null,
    notificationsOpen: false,
    foundersOpen: false,
    creatorsOpen: false,
    createPage: null,
    settingsOpen: false,
  };
  if (!alreadyOnboarded) {
    if (path === '/signin') return { ...base, flowStep: 'signin' };
    if (path === '/signup' || path === '/onboarding/profile') {
      return { ...base, flowStep: 'setup' };
    }
    if (path === '/onboarding/role') return { ...base, flowStep: 'role', roleSubStep: 'role' };
    if (path === '/onboarding/founder') return { ...base, flowStep: 'role', roleSubStep: 'founder-1' };
    if (path === '/onboarding/founder/details') return { ...base, flowStep: 'role', roleSubStep: 'founder-2' };
    if (path === '/onboarding/creator') return { ...base, flowStep: 'role', roleSubStep: 'creator-1' };
    return base;
  }
  if (path === '/create-post') {
    return { ...base, flowStep: 'main', activeTab: 'home', createPage: 'post' };
  }
  if (path === '/create-deal') {
    return { ...base, flowStep: 'main', activeTab: 'home', createPage: 'deal' };
  }
  if (path === '/founders') {
    return { ...base, flowStep: 'main', activeTab: 'home', foundersOpen: true };
  }
  if (path === '/creators') {
    return { ...base, flowStep: 'main', activeTab: 'home', creatorsOpen: true };
  }
  if (path === '/notifications') {
    return { ...base, flowStep: 'main', activeTab: 'home', notificationsOpen: true };
  }
  const commentsMatch = path.match(/^\/post\/([^/]+)\/comments$/);
  if (commentsMatch) {
    return {
      ...base,
      flowStep: 'main',
      activeTab: 'home',
      activeCommentsPostId: commentsMatch[1],
    };
  }
  if (path === '/chat') return { ...base, flowStep: 'main', activeTab: 'chat' };
  if (path.startsWith('/chat/')) {
    return {
      ...base,
      flowStep: 'main',
      activeTab: 'chat',
      activeChatId: path.slice('/chat/'.length) || null,
    };
  }
  if (path === '/deals') {
    return { ...base, flowStep: 'main', activeTab: 'search', brandDealsOpen: true };
  }
  if (path.startsWith('/deals/')) {
    const dealId = path.slice('/deals/'.length) || null;
    return {
      ...base,
      flowStep: 'main',
      activeTab: 'search',
      brandDealsOpen: true,
      selectedDealId: dealId,
    };
  }
  if (path.startsWith('/u/')) {
    const uname = decodeURIComponent(path.slice('/u/'.length) || '') || null;
    return {
      ...base,
      flowStep: 'main',
      activeTab: 'search',
      viewedUsername: uname,
    };
  }
  if (path === '/search') return { ...base, flowStep: 'main', activeTab: 'search' };
  if (path === '/settings') {
    return { ...base, flowStep: 'main', activeTab: 'profile', settingsOpen: true };
  }
  if (path === '/profile') return { ...base, flowStep: 'main', activeTab: 'profile' };
  return { ...base, flowStep: 'main', activeTab: 'home' };
}

export default function App() {
  const initialStored = useMemo(() => getStoredOnboardingState(), []);
  const initialSettings = useMemo(() => getStoredSettings(), []);
  const alreadyOnboarded = Boolean(initialStored);
  const initialRouteSnap = useMemo(
    () => snapshotFromPathname(window.location.pathname, alreadyOnboarded),
    [alreadyOnboarded]
  );

  const [showSplash, setShowSplash] = useState(true);
  const [settings, setSettings] = useState(initialSettings);
  const [appLocked, setAppLocked] = useState(
    Boolean(
      alreadyOnboarded &&
        initialSettings.biometricLockEnabled &&
        initialSettings.hasPasscode
    )
  );
  const [settingsOpen, setSettingsOpen] = useState(
    Boolean(initialRouteSnap.settingsOpen)
  );
  const [profileId, setProfileId] = useState(initialStored?.id || null);
  const [flowStep, setFlowStep] = useState(initialRouteSnap.flowStep); // onboarding | setup | role | main
  const [roleSubStep, setRoleSubStep] = useState(initialRouteSnap.roleSubStep); // role | founder-1 | founder-2 | creator-1
  const [setupData, setSetupData] = useState(
    initialStored?.setupData || {
      name: '',
      username: '',
      avatar: avatarDefault,
      password: '',
    }
  );
  const [setupError, setSetupError] = useState('');
  const [roleDetails, setRoleDetails] = useState(
    initialStored?.roleDetails || null
  );
  const [activeTab, setActiveTab] = useState(initialRouteSnap.activeTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [viewedUsername, setViewedUsername] = useState(
    initialRouteSnap.viewedUsername || null
  );
  const [viewedUserObj, setViewedUserObj] = useState(null);
  const [activeChatPeer, setActiveChatPeer] = useState(null);
  const [selectedUser, setSelectedUser] = useState(
    initialStored?.setupData?.name
      ? { ...USER_PROFILES[0], name: initialStored.setupData.name }
      : USER_PROFILES[0]
  );
  const [brandDealsOpen, setBrandDealsOpen] = useState(
    Boolean(initialRouteSnap.brandDealsOpen)
  );
  const [selectedDealId, setSelectedDealId] = useState(
    initialRouteSnap.selectedDealId || null
  );
  const [selectedDealObj, setSelectedDealObj] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [activeChatId, setActiveChatId] = useState(initialRouteSnap.activeChatId);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState(
    initialRouteSnap.activeCommentsPostId || null
  );
  const [notificationsOpen, setNotificationsOpen] = useState(
    initialRouteSnap.notificationsOpen
  );
  const [foundersOpen, setFoundersOpen] = useState(
    Boolean(initialRouteSnap.foundersOpen)
  );
  const [creatorsOpen, setCreatorsOpen] = useState(
    Boolean(initialRouteSnap.creatorsOpen)
  );
  const [createPage, setCreatePage] = useState(
    initialRouteSnap.createPage || null
  );
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [exitHint, setExitHint] = useState(false);
  const [transitionMode, setTransitionMode] = useState('none'); // none | push | pop | tab-right | tab-left

  const isPoppingRef = useRef(false);
  const historyReadyRef = useRef(false);
  const lastRootBackRef = useRef(0);
  const exitTimerRef = useRef(null);

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => n.unread).length,
    [notifications]
  );

  const navSnapshot = useMemo(
    () => ({
      flowStep,
      roleSubStep,
      activeTab,
      brandDealsOpen,
      selectedDealId,
      viewedUsername,
      hasPostModal: Boolean(selectedPost),
      activeChatId,
      activeCommentsPostId,
      notificationsOpen,
      foundersOpen,
      creatorsOpen,
      createPage,
      settingsOpen,
    }),
    [
      flowStep,
      roleSubStep,
      activeTab,
      brandDealsOpen,
      selectedDealId,
      viewedUsername,
      selectedPost,
      activeChatId,
      activeCommentsPostId,
      notificationsOpen,
      foundersOpen,
      creatorsOpen,
      createPage,
      settingsOpen,
    ]
  );

  const navKey = JSON.stringify(navSnapshot);
  const prevNavKeyRef = useRef(navKey);

  // Initialize browser history sentinel + root entry and sync profile with Supabase
  useEffect(() => {
    const initialPath = routeForSnapshot(initialRouteSnap);
    if (initialRouteSnap.activeCommentsPostId) {
      const homeRoot = {
        ...initialRouteSnap,
        activeCommentsPostId: null,
      };
      window.history.replaceState({ handoverSentinel: true }, '', '/home');
      window.history.pushState({ handoverNav: homeRoot }, '', '/home');
      window.history.pushState({ handoverNav: initialRouteSnap }, '', initialPath);
    } else {
      window.history.replaceState({ handoverSentinel: true }, '', initialPath);
      window.history.pushState({ handoverNav: initialRouteSnap }, '', initialPath);
    }
    historyReadyRef.current = true;

    if (initialStored) {
      syncProfileFromSupabase(initialStored).then((result) => {
        if (!result?.valid) {
          handleLogout();
          return;
        }
        const synced = result.profile;
        if (!synced) return;
        if (synced.id) {
          setProfileId(synced.id);
          fetchUserSettings(synced.id).then((remoteSettings) => {
            setSettings(remoteSettings);
            if (
              remoteSettings.biometricLockEnabled &&
              remoteSettings.hasPasscode
            ) {
              setAppLocked(true);
            }
          });
          fetchUserSettings(synced.id).then((remoteSettings) => {
            setSettings(remoteSettings);
            if (
              remoteSettings.biometricLockEnabled &&
              remoteSettings.hasPasscode
            ) {
              setAppLocked(true);
            }
          });
        }
        setSetupData((prev) => ({
          ...prev,
          ...synced.setupData,
          avatar: synced.setupData.avatar || prev.avatar,
        }));
        if (synced.roleDetails) {
          setRoleDetails(synced.roleDetails);
        }
        if (synced.setupData?.name) {
          setSelectedUser((prev) => ({ ...prev, name: synced.setupData.name }));
        }
      });
    }

    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, [initialRouteSnap, initialStored]);

  // Push history entry whenever user navigates forward in-app
  useEffect(() => {
    if (!historyReadyRef.current) return;
    if (isPoppingRef.current) {
      isPoppingRef.current = false;
      prevNavKeyRef.current = navKey;
      return;
    }
    if (prevNavKeyRef.current !== navKey) {
      prevNavKeyRef.current = navKey;
      window.history.pushState(
        { handoverNav: navSnapshot },
        '',
        routeForSnapshot(navSnapshot)
      );
    }
  }, [navKey, navSnapshot]);

  // Handle OS back gesture / browser back button
  useEffect(() => {
    const onPopState = (event) => {
      const state = event.state;

      if (state?.handoverNav) {
        isPoppingRef.current = true;
        setTransitionMode('pop');
        const target = state.handoverNav;
        setFlowStep(target.flowStep);
        setRoleSubStep(target.roleSubStep || 'role');
        setActiveTab(target.activeTab || 'home');
        setBrandDealsOpen(Boolean(target.brandDealsOpen));
        setSelectedDealId(target.selectedDealId || null);
        setViewedUsername(target.viewedUsername || null);
        if (!target.hasPostModal) {
          setSelectedPost(null);
        }
        setActiveChatId(target.activeChatId || null);
        setActiveCommentsPostId(target.activeCommentsPostId || null);
        setNotificationsOpen(Boolean(target.notificationsOpen));
        setFoundersOpen(Boolean(target.foundersOpen));
        setCreatorsOpen(Boolean(target.creatorsOpen));
        setCreatePage(target.createPage || null);
        setSettingsOpen(Boolean(target.settingsOpen));
        return;
      }

      // Hit root sentinel: keep user inside app unless they intentionally swipe twice within 1.8s
      const now = Date.now();
      if (now - lastRootBackRef.current < 1800) {
        return;
      }
      lastRootBackRef.current = now;
      setExitHint(true);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      exitTimerRef.current = setTimeout(() => setExitHint(false), 1800);

      const fallbackSnap = {
        flowStep,
        roleSubStep,
        activeTab,
        brandDealsOpen,
        selectedDealId,
        viewedUsername,
        hasPostModal: Boolean(selectedPost),
        activeChatId,
        activeCommentsPostId,
        notificationsOpen,
        foundersOpen,
        creatorsOpen,
        createPage,
        settingsOpen,
      };
      window.history.pushState(
        { handoverNav: fallbackSnap },
        '',
        routeForSnapshot(fallbackSnap)
      );
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [
    flowStep,
    roleSubStep,
    activeTab,
    brandDealsOpen,
    selectedDealId,
    viewedUsername,
    selectedPost,
    activeChatId,
    activeCommentsPostId,
    notificationsOpen,
    foundersOpen,
    creatorsOpen,
    createPage,
    settingsOpen,
  ]);

  const activePromo = PROMO_BY_CATEGORY.All;

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchedUsers([]);
      setSearchingUsers(false);
      return;
    }

    let cancelled = false;
    setSearchingUsers(true);
    const timer = setTimeout(() => {
      searchProfilesByName({
        query: trimmed,
        excludeProfileId: profileId,
        excludeUsername: setupData.username,
      }).then((rows) => {
        if (cancelled) return;
        setSearchedUsers(rows);
        setSearchingUsers(false);
      });
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, profileId, setupData.username]);

  const goBackInHistory = useCallback(() => {
    triggerLightHaptic();
    window.history.back();
  }, []);

  const handleTabSelect = (tabId) => {
    triggerLightHaptic();
    if (tabId === activeTab) {
      if (activeTab === 'home' && foundersOpen) {
        setTransitionMode('pop');
        setFoundersOpen(false);
      } else if (activeTab === 'home' && creatorsOpen) {
        setTransitionMode('pop');
        setCreatorsOpen(false);
      } else if (activeTab === 'home' && notificationsOpen) {
        setTransitionMode('pop');
        setNotificationsOpen(false);
      } else if (activeTab === 'search' && viewedUsername) {
        setTransitionMode('pop');
        setViewedUsername(null);
        setViewedUserObj(null);
      } else if (activeTab === 'search' && brandDealsOpen) {
        setTransitionMode('pop');
        if (selectedDealId) {
          setSelectedDealId(null);
        } else {
          setBrandDealsOpen(false);
        }
      } else if (activeTab === 'profile' && settingsOpen) {
        setTransitionMode('pop');
        setSettingsOpen(false);
      }
      return;
    }
    const nextIdx = TAB_ORDER[tabId] ?? 0;
    const prevIdx = TAB_ORDER[activeTab] ?? 0;
    setTransitionMode(nextIdx > prevIdx ? 'tab-right' : 'tab-left');
    if (tabId !== 'search') {
      setBrandDealsOpen(false);
      setSelectedDealId(null);
      setViewedUsername(null);
      setViewedUserObj(null);
    }
    setActiveTab(tabId);
  };

  const handleCloseProfile = () => {
    goBackInHistory();
  };

  const handleBack = () => {
    triggerLightHaptic();
    if (brandDealsOpen || viewedUsername) {
      goBackInHistory();
      return;
    }
    if (searchQuery) {
      setSearchQuery('');
      return;
    }
    goBackInHistory();
  };

  const handleSetupComplete = (data) => {
    setSetupError('');
    setSetupData(data);
    if (data.name) {
      setSelectedUser((prev) => ({ ...prev, name: data.name }));
    }
    setRoleSubStep('role');
    setFlowStep('role');
  };

  const enterHomeFeedRoot = () => {
    const mainRoot = {
      flowStep: 'main',
      roleSubStep: 'role',
      activeTab: 'home',
      brandDealsOpen: false,
      selectedDealId: null,
      hasPostModal: false,
      activeChatId: null,
      activeCommentsPostId: null,
      notificationsOpen: false,
      settingsOpen: false,
    };
    isPoppingRef.current = true;
    prevNavKeyRef.current = JSON.stringify(mainRoot);
    window.history.replaceState({ handoverSentinel: true }, '', '/home');
    window.history.pushState({ handoverNav: mainRoot }, '', '/home');

    setActiveTab('home');
    setBrandDealsOpen(false);
    setSelectedDealId(null);
    setViewedUsername(null);
    setViewedUserObj(null);
    setActiveChatPeer(null);
    setFoundersOpen(false);
    setCreatorsOpen(false);
    setCreatePage(null);
    setNotificationsOpen(false);
    setActiveChatId(null);
    setActiveCommentsPostId(null);
    setSettingsOpen(false);
    setTransitionMode('push');
    setFlowStep('main');
  };

  const handleUpdateSettings = async (patch) => {
    const next = await saveUserSettings(profileId, patch);
    setSettings(next);
    return next;
  };

  const handleProfileUpdated = ({ name, bio, avatar, companyName }) => {
    const updatedSetup = {
      ...setupData,
      name: name ?? setupData.name,
      bio: bio ?? setupData.bio ?? '',
      avatar: avatar ?? setupData.avatar,
    };
    const updatedRole =
      roleDetails?.role === 'founder' && companyName !== undefined
        ? { ...roleDetails, companyName }
        : roleDetails;

    setSetupData(updatedSetup);
    if (updatedRole !== roleDetails) {
      setRoleDetails(updatedRole);
    }
    if (name) {
      setSelectedUser((prev) => ({ ...prev, name }));
    }

    persistLocalProfile({
      id: profileId,
      onboardingCompleted: true,
      setupData: updatedSetup,
      roleDetails: updatedRole,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleLogout = () => {
    clearStoredOnboardingState();
    clearStoredSettings();
    setSettings({ ...DEFAULT_SETTINGS });
    setAppLocked(false);
    setSetupError('');
    setSetupData({
      name: '',
      username: '',
      avatar: avatarDefault,
      password: '',
    });
    setRoleDetails(null);
    setRoleSubStep('role');
    setActiveTab('home');
    setBrandDealsOpen(false);
    setSelectedDealId(null);
    setSelectedDealObj(null);
    setViewedUsername(null);
    setViewedUserObj(null);
    setActiveChatPeer(null);
    setFoundersOpen(false);
    setCreatorsOpen(false);
    setCreatePage(null);
    setNotificationsOpen(false);
    setActiveChatId(null);
    setActiveCommentsPostId(null);
    setSettingsOpen(false);
    const resetRoot = {
      flowStep: 'onboarding',
      roleSubStep: 'role',
      activeTab: 'home',
      brandDealsOpen: false,
      selectedDealId: null,
      viewedUsername: null,
      hasPostModal: false,
      activeChatId: null,
      activeCommentsPostId: null,
      notificationsOpen: false,
      settingsOpen: false,
    };
    isPoppingRef.current = true;
    prevNavKeyRef.current = JSON.stringify(resetRoot);
    window.history.replaceState({ handoverSentinel: true }, '', '/auth');
    window.history.pushState({ handoverNav: resetRoot }, '', '/auth');
    setProfileId(null);
    setTransitionMode('pop');
    setFlowStep('onboarding');
  };

  const handleSignInSuccess = async (profile) => {
    setProfileId(profile.id || null);
    setSetupData(profile.setupData);
    setRoleDetails(profile.roleDetails);
    if (profile.setupData?.name) {
      setSelectedUser((prev) => ({ ...prev, name: profile.setupData.name }));
    }
    if (profile.id) {
      const remoteSettings = await fetchUserSettings(profile.id);
      setSettings(remoteSettings);
    }
    setAppLocked(false);
    enterHomeFeedRoot();
  };

  const handleRoleComplete = async (details) => {
    setRoleDetails(details);

    const result = await saveOnboardedProfile({
      setupData,
      roleDetails: details,
    });

    if (result?.error === 'USERNAME_TAKEN') {
      setSetupError(
        `@${setupData.username} was already claimed — please choose a different username.`
      );
      setTransitionMode('pop');
      setFlowStep('setup');
      return;
    }

    if (result?.profile?.id) {
      setProfileId(result.profile.id);
      saveUserSettings(result.profile.id, settings);
    }
    setSetupData((prev) => ({ ...prev, password: '' }));
    enterHomeFeedRoot();
  };

  const screenViewKey =
    flowStep !== 'main'
      ? flowStep === 'role'
        ? `role-${roleSubStep}`
        : flowStep
      : activeTab === 'profile' && settingsOpen
        ? 'settings'
        : activeTab === 'home' && createPage === 'post'
          ? 'create-post'
          : activeTab === 'home' && createPage === 'deal'
            ? 'create-deal'
            : activeTab === 'home' && foundersOpen
              ? 'founders'
          : activeTab === 'home' && creatorsOpen
            ? 'creators'
            : activeTab === 'home' && notificationsOpen
              ? 'notifications'
              : activeTab === 'search' && viewedUsername
                ? `public-profile-${viewedUsername}`
                : activeTab === 'search' && brandDealsOpen && selectedDealId
                  ? `brand-deal-${selectedDealId}`
                  : activeTab === 'search' && brandDealsOpen
                    ? 'brand-deals'
                    : `tab-${activeTab}`;

  return (
    <div className="viewport-stage">
      <main
        className="mobile-screen"
        aria-label={
          flowStep === 'onboarding'
            ? 'Welcome and sign in'
            : flowStep === 'signin'
              ? 'Sign in screen'
              : flowStep === 'setup'
                ? 'Profile setup screen'
                : flowStep === 'role'
                  ? 'Founder or Creator selection'
                  : activeTab === 'profile'
                    ? `${selectedUser.name} profile screen`
                    : 'Brands discovery screen'
        }
      >
        <div
          key={screenViewKey}
          className={`screen-stage-view ${
            transitionMode !== 'none' ? `is-${transitionMode}` : ''
          }`}
        >
        {flowStep === 'onboarding' ? (
          <OnboardingScreen
            onSignUp={() => {
              setTransitionMode('push');
              setFlowStep('setup');
            }}
            onSignIn={() => {
              setTransitionMode('push');
              setFlowStep('signin');
            }}
          />
        ) : flowStep === 'signin' ? (
          <SignInScreen
            onBack={goBackInHistory}
            onSuccess={handleSignInSuccess}
            onSwitchToSignUp={() => {
              setTransitionMode('push');
              setSetupError('');
              setFlowStep('setup');
            }}
          />
        ) : flowStep === 'setup' ? (
          <ProfileSetupScreen
            initialData={setupData}
            initialError={setupError}
            onBack={goBackInHistory}
            onComplete={(data) => {
              setTransitionMode('push');
              handleSetupComplete(data);
            }}
            onSwitchToSignIn={() => {
              setTransitionMode('push');
              setFlowStep('signin');
            }}
          />
        ) : flowStep === 'role' ? (
          <RoleOnboardingFlow
            userName={selectedUser.name}
            subStep={roleSubStep}
            onSubStepChange={(nextSub) => {
              setTransitionMode('push');
              setRoleSubStep(nextSub);
            }}
            initialData={roleDetails}
            onSaveDraft={setRoleDetails}
            onBackToSetup={goBackInHistory}
            onComplete={handleRoleComplete}
          />
        ) : activeTab === 'profile' && settingsOpen ? (
          <SettingsScreen
            currentUser={{
              id: profileId,
              name: selectedUser.name,
              username: setupData.username,
              bio: setupData.bio || '',
              avatar: setupData.avatar,
            }}
            roleDetails={roleDetails}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onProfileUpdated={handleProfileUpdated}
            onTriggerLockTest={() => setAppLocked(true)}
            onBack={goBackInHistory}
            onLogout={handleLogout}
          />
        ) : activeTab === 'profile' ? (
          <ProfileScreen
            currentUser={{
              id: profileId,
              name: selectedUser.name,
              username: setupData.username,
              bio: setupData.bio || '',
              avatar: setupData.avatar,
            }}
            roleDetails={roleDetails}
            showBadges={settings.showBadges}
            onClose={handleCloseProfile}
            selectedPost={selectedPost}
            onSelectPost={setSelectedPost}
            onClosePost={goBackInHistory}
            onOpenSettings={() => {
              setTransitionMode('push');
              setSettingsOpen(true);
            }}
            tabs={TABS}
            activeTab={activeTab}
            onSelectTab={handleTabSelect}
          />
        ) : activeTab === 'home' && createPage === 'post' ? (
          <CreatePostScreen
            currentUser={{
              id: profileId,
              name: selectedUser.name,
              username: setupData.username,
              avatar: setupData.avatar,
              role: roleDetails?.role || '',
              companyName: roleDetails?.companyName || '',
              companyLogoUrl: roleDetails?.companyLogoUrl || '',
            }}
            onBack={goBackInHistory}
            onPublished={() => {
              goBackInHistory();
            }}
          />
        ) : activeTab === 'home' && createPage === 'deal' ? (
          <CreateBrandDealScreen
            currentUser={{
              id: profileId,
              name: selectedUser.name,
              username: setupData.username,
              avatar: setupData.avatar,
              role: roleDetails?.role || '',
              companyName: roleDetails?.companyName || '',
              companyLogoUrl: roleDetails?.companyLogoUrl || '',
            }}
            onBack={goBackInHistory}
            onPublished={(createdDeal) => {
              setCreatePage(null);
              setTransitionMode('push');
              setSelectedDealObj(createdDeal || null);
              setSelectedDealId(createdDeal?.id || null);
              setBrandDealsOpen(true);
              setActiveTab('search');
            }}
          />
        ) : activeTab === 'home' && foundersOpen ? (
          <FoundersScreen
            onBack={goBackInHistory}
            onOpenChat={() => {
              setFoundersOpen(false);
              setTransitionMode('tab-right');
              setActiveTab('chat');
            }}
          />
        ) : activeTab === 'home' && creatorsOpen ? (
          <CreatorsScreen
            onBack={goBackInHistory}
            onOpenProfile={() => {
              setCreatorsOpen(false);
              handleTabSelect('profile');
            }}
            onOpenChat={() => {
              setCreatorsOpen(false);
              setTransitionMode('tab-right');
              setActiveTab('chat');
            }}
          />
        ) : activeTab === 'home' && notificationsOpen ? (
          <NotificationsScreen
            notifications={notifications}
            onBack={goBackInHistory}
            onFollowBack={(id) =>
              setNotifications((prev) =>
                prev.map((n) =>
                  n.id === id ? { ...n, followingBack: true, unread: false } : n
                )
              )
            }
            onMarkAllRead={() =>
              setNotifications((prev) =>
                prev.map((n) => ({ ...n, unread: false }))
              )
            }
            onMarkRead={(id) =>
              setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
              )
            }
            onOpenProfile={() => {
              setNotificationsOpen(false);
              handleTabSelect('profile');
            }}
          />
        ) : activeTab === 'home' ? (
          <HomeFeedScreen
            currentUser={{
              id: profileId,
              name: selectedUser.name,
              username: setupData.username,
              avatar: setupData.avatar,
              role: roleDetails?.role || '',
              companyName: roleDetails?.companyName || '',
              companyLogoUrl: roleDetails?.companyLogoUrl || '',
            }}
            unreadNotifications={unreadNotifications}
            onOpenNotifications={() => {
              setTransitionMode('push');
              setNotificationsOpen(true);
            }}
            onOpenFounders={() => {
              setTransitionMode('push');
              setFoundersOpen(true);
            }}
            onOpenCreators={() => {
              setTransitionMode('push');
              setCreatorsOpen(true);
            }}
            onOpenCreatePost={() => {
              setTransitionMode('push');
              setCreatePage('post');
            }}
            onOpenCreateDeal={() => {
              setTransitionMode('push');
              setCreatePage('deal');
            }}
            onOpenProfile={() => handleTabSelect('profile')}
            activeCommentsPostId={activeCommentsPostId}
            onOpenComments={(postId) => setActiveCommentsPostId(String(postId))}
            onCloseComments={goBackInHistory}
            tabs={TABS}
            activeTab={activeTab}
            onSelectTab={handleTabSelect}
          />
        ) : activeTab === 'chat' ? (
          <ChatScreen
            tabs={TABS}
            activeTab={activeTab}
            onSelectTab={handleTabSelect}
            activeThreadId={activeChatId}
            activePeer={activeChatPeer}
            onOpenThread={(id) => setActiveChatId(id)}
            onCloseThread={goBackInHistory}
          />
        ) : activeTab === 'search' && viewedUsername ? (
          <ProfileScreen
            isPublicView
            viewedUsername={viewedUsername}
            profileUser={
              viewedUserObj?.username?.toLowerCase() === viewedUsername?.toLowerCase()
                ? viewedUserObj
                : null
            }
            showBadges={settings.showBadges}
            onClose={goBackInHistory}
            selectedPost={selectedPost}
            onSelectPost={setSelectedPost}
            onClosePost={goBackInHistory}
            onMessageUser={(peer) => {
              if (!peer?.id) return;
              setViewedUsername(null);
              setViewedUserObj(null);
              setActiveChatPeer(peer);
              setActiveChatId(peer.id);
              setTransitionMode('push');
              setActiveTab('chat');
            }}
            tabs={TABS}
            activeTab={activeTab}
            onSelectTab={handleTabSelect}
          />
        ) : activeTab === 'search' && brandDealsOpen && selectedDealId ? (
          <BrandDealDetailScreen
            dealId={selectedDealId}
            initialDeal={
              selectedDealObj?.id === selectedDealId ? selectedDealObj : null
            }
            onBack={goBackInHistory}
          />
        ) : activeTab === 'search' && brandDealsOpen ? (
          <BrandDealsScreen
            currentUser={{
              id: profileId,
              name: selectedUser.name,
              username: setupData.username,
              avatar: setupData.avatar,
            }}
            onBack={goBackInHistory}
            onSelectDeal={(deal) => {
              setTransitionMode('push');
              setSelectedDealObj(deal);
              setSelectedDealId(deal.id);
            }}
            onOpenNotifications={() => {
              setBrandDealsOpen(false);
              setTransitionMode('push');
              setActiveTab('home');
              setNotificationsOpen(true);
            }}
            onOpenProfile={() => {
              setBrandDealsOpen(false);
              handleTabSelect('profile');
            }}
            tabs={TABS}
            activeTab={activeTab}
            onSelectTab={handleTabSelect}
          />
        ) : (
          <>
            <div className="screen-content">
              {/* Top Navigation Row with Search */}
              <header className="top-bar">
                <button
                  type="button"
                  className="back-btn top-back-btn"
                  onClick={handleBack}
                  aria-label="Go back"
                >
                  <BackTriangleIcon />
                </button>

                <label
                  className="search-box top-search-box"
                  aria-label="Search people by name or username"
                >
                  <SearchIcon />
                  <input
                    type="search"
                    className="search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search people by name or @username"
                  />
                </label>
              </header>

              {/* Subtitle & Title */}
              <section className="hero-header">
                <p className="partner-count">142 partners earning miles</p>
                <h1 className="screen-title">Brands</h1>
              </section>

              {/* Center 3D Hero Illustration */}
              <section className="collage-stage" aria-hidden={Boolean(searchQuery.trim())}>
                <img
                  src={heroCollage}
                  alt="Gaming, live entertainment ticket, and bowling partner rewards"
                  className="collage-image"
                />

                {searchQuery.trim() && (
                  <div className="search-results-sheet" role="region" aria-label="Search results">
                    <div className="search-results-header">
                      <span>
                        {searchingUsers
                          ? 'Searching...'
                          : `${searchedUsers.length} matching ${
                              searchedUsers.length === 1 ? 'person' : 'people'
                            }`}
                      </span>
                      <button
                        type="button"
                        className="clear-search-btn"
                        onClick={() => setSearchQuery('')}
                      >
                        Clear
                      </button>
                    </div>
                    {searchingUsers && searchedUsers.length === 0 ? (
                      <div className="search-result-cat">Searching users...</div>
                    ) : searchedUsers.length > 0 ? (
                      searchedUsers.map((person) => (
                        <button
                          key={person.id}
                          type="button"
                          className="search-result-row search-user-row"
                          onClick={() => {
                            triggerLightHaptic();
                            setTransitionMode('push');
                            setViewedUserObj(person);
                            setViewedUsername(person.username);
                          }}
                        >
                          <div className="search-user-left">
                            <img
                              src={person.avatar || avatarDefault}
                              alt={person.fullName}
                              className="search-user-avatar"
                            />
                            <div className="search-user-meta">
                              <div className="search-result-brand">
                                {person.fullName}
                              </div>
                              <div className="search-result-cat">
                                @{person.username}
                                {person.companyName
                                  ? ` · ${person.companyName}`
                                  : ''}
                              </div>
                            </div>
                          </div>
                          <span className="search-result-rate">
                            {person.role === 'founder' ? 'Founder' : 'Creator'}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="search-result-cat">
                        No people matched &ldquo;{searchQuery}&rdquo;.
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* Featured Promo Banner */}
              <section className="promo-wrap">
                <button
                  type="button"
                  className="promo-card"
                  onClick={() => {
                    triggerLightHaptic();
                    setTransitionMode('push');
                    setBrandDealsOpen(true);
                  }}
                >
                  <div>
                    <div className="promo-title">{activePromo.title}</div>
                  </div>
                  <span className="promo-badge">{activePromo.badge}</span>
                </button>
              </section>

              {/* Floating Bottom Tab Navigation */}
              <BottomNav
                tabs={TABS}
                activeTab={activeTab}
                onSelectTab={handleTabSelect}
              />
            </div>
          </>
        )}
        </div>

        {exitHint && (
          <div className="app-exit-toast" role="status">
            Swipe back again to exit
          </div>
        )}

        {appLocked && !showSplash && settings.hasPasscode && (
          <PasscodeLockScreen
            mode="unlock"
            user={{
              name: selectedUser.name,
              username: setupData.username,
              avatar: setupData.avatar,
            }}
            storedPasscodeHash={settings.passcodeHash}
            biometricCredentialId={settings.biometricCredentialId}
            onUnlocked={() => setAppLocked(false)}
            onForgotLogout={handleLogout}
          />
        )}

        {appLocked && !showSplash && settings.hasPasscode && (
          <PasscodeLockScreen
            mode="unlock"
            user={{
              name: selectedUser.name,
              username: setupData.username,
              avatar: setupData.avatar,
            }}
            storedPasscodeHash={settings.passcodeHash}
            biometricCredentialId={settings.biometricCredentialId}
            onUnlocked={() => setAppLocked(false)}
            onForgotLogout={handleLogout}
          />
        )}

        {showSplash && (
          <SplashScreen onFinish={() => setShowSplash(false)} />
        )}
      </main>
    </div>
  );
}
