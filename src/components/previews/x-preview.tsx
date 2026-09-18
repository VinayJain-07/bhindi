'use client';

import React from 'react';
import { MoreHorizontal, MessageCircle, Repeat, Heart, Bookmark, Share } from 'lucide-react';

export interface XPreviewProps {
  displayName: string;
  handle: string;
  avatarUrl?: string;
  content: string;
  format?: 'SINGLE_POST' | 'THREAD' | 'REPLY' | 'REPURPOSE';
  threadTweets?: Array<{ tweetNumber: number; content: string; visualOrCodeSnippet?: string }>;
  replyTarget?: { contextSummary: string; recommendedReply: string };
  likesCount?: number;
  repostsCount?: number;
  repliesCount?: number;
}

// Helper to format hashtags and mentions
const formatText = (text: string) => {
  const parts = text.split(/(#[a-zA-Z0-9_]+|@[a-zA-Z0-9_]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('#') || part.startsWith('@')) {
      return <span key={i} className="x-preview-text-accent">{part}</span>;
    }
    return <span key={i}>{part}</span>;
  });
};

const formatNumber = (num?: number) => {
  if (!num) return '';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const CharacterCount = ({ text }: { text: string }) => {
  const count = text.length;
  const isWarning = count > 260;
  const isError = count > 280;
  
  return (
    <div className={`x-preview-char-count ${isError ? 'x-preview-char-error' : isWarning ? 'x-preview-char-warning' : 'x-preview-char-ok'}`}>
      {count}/280
    </div>
  );
};

export const XPreview: React.FC<XPreviewProps> = ({
  displayName,
  handle,
  avatarUrl,
  content,
  format = 'SINGLE_POST',
  threadTweets,
  replyTarget,
  likesCount = 0,
  repostsCount = 0,
  repliesCount = 0,
}) => {
  const getInitials = (name: string) => name.substring(0, 2).toUpperCase();

  const Avatar = ({ url, name }: { url?: string; name: string }) => (
    <div className="x-preview-avatar">
      {url ? (
        <img src={url} alt={name} className="x-preview-avatar-img" />
      ) : (
        <div className="x-preview-avatar-fallback">{getInitials(name)}</div>
      )}
    </div>
  );

  const ActionBar = ({ r, rp, l }: { r: number; rp: number; l: number }) => (
    <div className="x-preview-actions">
      <button className="x-preview-action-btn x-preview-action-reply" aria-label="Reply">
        <MessageCircle size={16} />
        {r > 0 && <span>{formatNumber(r)}</span>}
      </button>
      <button className="x-preview-action-btn x-preview-action-repost" aria-label="Repost">
        <Repeat size={16} />
        {rp > 0 && <span>{formatNumber(rp)}</span>}
      </button>
      <button className="x-preview-action-btn x-preview-action-like" aria-label="Like">
        <Heart size={16} />
        {l > 0 && <span>{formatNumber(l)}</span>}
      </button>
      <button className="x-preview-action-btn x-preview-action-view" aria-label="Bookmark">
        <Bookmark size={16} />
      </button>
      <button className="x-preview-action-btn x-preview-action-share" aria-label="Share">
        <Share size={16} />
      </button>
    </div>
  );

  const renderPost = (text: string, isReplyContext: boolean = false, isLast: boolean = true) => (
    <div className="x-preview-post-container">
      <div className="x-preview-left-col">
        <Avatar url={avatarUrl} name={displayName} />
        {!isLast && <div className="x-preview-thread-line" />}
      </div>
      <div className="x-preview-right-col">
        <div className="x-preview-header">
          <div className="x-preview-user-info">
            <span className="x-preview-display-name">{displayName}</span>
            <span className="x-preview-handle">@{handle}</span>
            <span className="x-preview-dot">·</span>
            <span className="x-preview-time">{isReplyContext ? '2h' : 'Just now'}</span>
          </div>
          {!isReplyContext && (
            <button className="x-preview-more-btn" aria-label="More">
              <MoreHorizontal size={16} />
            </button>
          )}
        </div>
        <div className="x-preview-content">
          {formatText(text)}
        </div>
        {!isReplyContext && (
          <div className="x-preview-meta">
            <CharacterCount text={text} />
          </div>
        )}
        {!isReplyContext && <ActionBar r={repliesCount} rp={repostsCount} l={likesCount} />}
      </div>
    </div>
  );

  return (
    <div className="x-preview-wrapper">
      {format === 'REPLY' && replyTarget && (
        <div className="x-preview-reply-context">
          {renderPost(replyTarget.contextSummary, true, false)}
        </div>
      )}
      
      {format === 'THREAD' && threadTweets && threadTweets.length > 0 ? (
        <div className="x-preview-thread">
          {renderPost(content, false, false)}
          {threadTweets.map((tweet, idx) => (
            <div key={idx} className="x-preview-thread-item">
              {renderPost(tweet.content, false, idx === threadTweets.length - 1)}
            </div>
          ))}
        </div>
      ) : (
        renderPost(format === 'REPLY' && replyTarget ? replyTarget.recommendedReply : content, false, true)
      )}
      
      <div className="x-preview-footer">
        Draft preview · Not affiliated with X
      </div>
    </div>
  );
};
