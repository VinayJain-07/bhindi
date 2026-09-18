"use client";

import React, { useState } from "react";
import { ThumbsUp, MessageSquare, Repeat, Send, MoreHorizontal, Globe } from "lucide-react";

export interface LinkedInPreviewProps {
  companyName: string;
  companyHeadline?: string;
  avatarUrl?: string;
  content: string;
  likesCount?: number;
  commentsCount?: number;
  repostsCount?: number;
}

const formatText = (text: string) => {
  const parts = text.split(/(#[a-zA-Z0-9_]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("#")) {
      return (
        <span key={i} className="linkedin-preview__hashtag">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

export function LinkedInPreview({
  companyName,
  companyHeadline = "Intelligence & Growth",
  avatarUrl,
  content,
  likesCount = 84,
  commentsCount = 19,
  repostsCount = 7,
}: LinkedInPreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const isLong = content.length > 200;
  const displayContent = !expanded && isLong ? content.slice(0, 180) + "…" : content;

  return (
    <div className="linkedin-preview">
      {/* ── Header ── */}
      <div className="linkedin-preview__header">
        <div className="linkedin-preview__author">
          <div className="linkedin-preview__avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt={companyName} className="linkedin-preview__avatar-img" />
            ) : (
              <span>{companyName.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div className="linkedin-preview__author-info">
            <span className="linkedin-preview__name">{companyName}</span>
            <span className="linkedin-preview__headline">{companyHeadline}</span>
            <span className="linkedin-preview__time">
              1d · <Globe size={10} />
            </span>
          </div>
        </div>
        <button type="button" className="linkedin-preview__more-btn" aria-label="More options">
          <MoreHorizontal size={16} />
        </button>
      </div>

      {/* ── Content ── */}
      <div className="linkedin-preview__body">
        <p className="linkedin-preview__text">
          {formatText(displayContent)}
          {isLong && !expanded && (
            <button
              type="button"
              className="linkedin-preview__see-more"
              onClick={() => setExpanded(true)}
            >
              …see more
            </button>
          )}
        </p>
      </div>

      {/* ── Social Stats ── */}
      {likesCount + commentsCount + repostsCount > 0 && (
        <div className="linkedin-preview__stats">
          <span className="linkedin-preview__likes">
            <ThumbsUp size={11} className="linkedin-preview__like-icon" /> {likesCount}
          </span>
          <span className="linkedin-preview__engagement">
            {commentsCount} comments · {repostsCount} reposts
          </span>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="linkedin-preview__actions">
        <button type="button" className="linkedin-preview__action-btn">
          <ThumbsUp size={14} />
          <span>Like</span>
        </button>
        <button type="button" className="linkedin-preview__action-btn">
          <MessageSquare size={14} />
          <span>Comment</span>
        </button>
        <button type="button" className="linkedin-preview__action-btn">
          <Repeat size={14} />
          <span>Repost</span>
        </button>
        <button type="button" className="linkedin-preview__action-btn">
          <Send size={14} />
          <span>Send</span>
        </button>
      </div>

      {/* ── Simulation Footer ── */}
      <div className="linkedin-preview__footer">
        Draft preview · Not affiliated with LinkedIn
      </div>
    </div>
  );
}
