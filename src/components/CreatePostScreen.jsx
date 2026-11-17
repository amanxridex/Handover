import React, { useRef, useState } from 'react';
import avatarDefault from '../assets/avatar-default.jpg';
import feedWarmPost from '../assets/feed-warm-post.jpg';
import { createFeedPost } from '../services/feedService';
import { compressImageFile } from '../utils/imageCompress';
import {
  triggerLightHaptic,
  triggerSuccessHaptic,
} from '../utils/nativeBridge';

function BackArrowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M19 12H5M5 12L11 6M5 12L11 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CreatePostScreen({
  currentUser,
  onBack,
  onPublished,
}) {
  const fileInputRef = useRef(null);
  const [headline, setHeadline] = useState('');
  const [imageData, setImageData] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handlePhotoPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 1440, 0.9);
      if (compressed) {
        setImageData(compressed);
        setErrorMsg('');
      }
    } catch {
      setErrorMsg('Could not read that image. Try another photo.');
    }
    e.target.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanText = headline.trim();
    if (!cleanText) {
      setErrorMsg('Write something to share on your post.');
      return;
    }
    if (publishing) return;

    triggerLightHaptic();
    setPublishing(true);
    setErrorMsg('');

    const displayName =
      currentUser?.name?.trim() ||
      currentUser?.username?.trim() ||
      'Handover Member';
    const rawUsername = currentUser?.username?.trim() || '';
    const handle = rawUsername
      ? `@${rawUsername}`
      : `@${displayName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'you'}`;

    const { post, error } = await createFeedPost({
      authorId: currentUser?.id || null,
      authorName: displayName,
      authorHandle: handle,
      avatar: currentUser?.avatar || avatarDefault,
      authorRole: currentUser?.role || 'creator',
      companyName: currentUser?.companyName || '',
      companyLogoUrl: currentUser?.companyLogoUrl || '',
      headline: cleanText,
      image: imageData || feedWarmPost,
      likesCount: 0,
      liked: false,
    });

    setPublishing(false);

    if (!post?.id) {
      setErrorMsg(error || 'Could not publish post. Please try again.');
      return;
    }

    triggerSuccessHaptic();
    onPublished?.(post);
  };

  return (
    <div className="composer-page-screen">
      <form className="composer-page-scroll" onSubmit={handleSubmit}>
        <header className="composer-page-header">
          <button
            type="button"
            className="composer-back-btn"
            onClick={() => {
              triggerLightHaptic();
              onBack?.();
            }}
            aria-label="Back to feed"
          >
            <BackArrowIcon />
          </button>
          <h1 className="composer-page-title">Create post</h1>
          <span className="composer-header-spacer" aria-hidden="true" />
        </header>

        <div className="composer-author-row">
          <img
            src={currentUser?.avatar || avatarDefault}
            alt={currentUser?.name || 'You'}
            className="composer-author-avatar"
          />
          <div>
            <div className="composer-author-name">
              {currentUser?.name || 'Handover Member'}
            </div>
            <div className="composer-author-handle">
              @{currentUser?.username || 'member'}
            </div>
          </div>
        </div>

        <label className="composer-field-label" htmlFor="post-headline-input">
          What do you want to write?
        </label>
        <textarea
          id="post-headline-input"
          className="composer-textarea"
          rows={4}
          placeholder="Write something cool to share..."
          value={headline}
          onChange={(e) => {
            setHeadline(e.target.value);
            if (errorMsg) setErrorMsg('');
          }}
        />

        <div className="composer-field-label">Choose image</div>
        <button
          type="button"
          className="composer-photo-box"
          onClick={() => fileInputRef.current?.click()}
        >
          {imageData ? (
            <img
              src={imageData}
              alt="Selected post"
              className="composer-photo-preview"
            />
          ) : (
            <div className="composer-photo-empty">
              <span className="composer-photo-plus">+</span>
              <span>Choose an image from your device</span>
            </div>
          )}
        </button>

        {imageData && (
          <div className="composer-photo-actions">
            <button
              type="button"
              className="composer-photo-action-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              Change image
            </button>
            <button
              type="button"
              className="composer-photo-action-btn is-danger"
              onClick={() => setImageData('')}
            >
              Remove
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handlePhotoPick}
        />

        {errorMsg && (
          <p className="composer-error" role="alert">
            {errorMsg}
          </p>
        )}

        <div className="composer-submit-wrap">
          <button
            type="submit"
            className="composer-primary-btn"
            disabled={publishing}
          >
            {publishing ? 'Publishing...' : 'Post to Feed'}
          </button>
        </div>
      </form>
    </div>
  );
}
