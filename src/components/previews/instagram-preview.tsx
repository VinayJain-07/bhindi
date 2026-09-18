'use client';

import React, { useState } from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, ChevronLeft, ChevronRight, Play } from 'lucide-react';

interface InstagramPreviewProps {
  username: string;
  profileImageUrl?: string;
  location?: string;
  format: 'CAROUSEL' | 'REEL' | 'STORY' | 'SINGLE_IMAGE' | 'INFOGRAPHIC';
  caption: string;
  hashtags: string[];
  carouselSlides?: Array<{ slideNumber: number; headline: string; bodyContent: string; visualDirection: string }>;
  reelStoryboard?: Array<{ timestamp: string; phase: string; visualAction: string; onScreenText: string }>;
  storyFrames?: Array<{ frameNumber: number; textOverlay: string; interactiveElement?: { type: string; prompt: string; options?: string[] } }>;
  onCaptionChange?: (caption: string) => void;
}

export function InstagramPreview({
  username,
  profileImageUrl,
  location,
  format,
  caption,
  hashtags,
  carouselSlides,
  reelStoryboard,
  storyFrames,
}: InstagramPreviewProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  const handlePrevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const handleNextSlide = () => {
    if (carouselSlides && currentSlideIndex < carouselSlides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  const renderMedia = () => {
    switch (format) {
      case 'CAROUSEL':
        if (!carouselSlides || carouselSlides.length === 0) return null;
        const currentSlide = carouselSlides[currentSlideIndex];
        return (
          <div className="ig-preview-media-container ig-preview-aspect-square">
            <div className="ig-preview-carousel-slide">
              <div className="ig-preview-slide-content">
                <h4 className="ig-preview-slide-headline">{currentSlide.headline}</h4>
                <p className="ig-preview-slide-visual">{currentSlide.visualDirection}</p>
              </div>
            </div>
            
            {currentSlideIndex > 0 && (
              <button className="ig-preview-nav-button ig-preview-nav-left" onClick={handlePrevSlide} title="Previous slide">
                <ChevronLeft size={16} />
              </button>
            )}
            
            {currentSlideIndex < carouselSlides.length - 1 && (
              <button className="ig-preview-nav-button ig-preview-nav-right" onClick={handleNextSlide} title="Next slide">
                <ChevronRight size={16} />
              </button>
            )}
            
            <div className="ig-preview-carousel-indicators-wrapper">
              <div className="ig-preview-carousel-indicators">
                {carouselSlides.map((_, index) => (
                  <div 
                    key={index} 
                    className={`ig-preview-dot ${index === currentSlideIndex ? 'ig-preview-dot-active' : ''}`}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      case 'REEL':
        const firstReelFrame = reelStoryboard?.[0];
        return (
          <div className="ig-preview-media-container ig-preview-aspect-reel">
            <div className="ig-preview-reel-content">
              <Play className="ig-preview-play-icon" size={48} />
              {firstReelFrame && (
                <div className="ig-preview-reel-overlay">
                  <p>{firstReelFrame.onScreenText}</p>
                </div>
              )}
            </div>
          </div>
        );
      case 'STORY':
        const firstStoryFrame = storyFrames?.[0];
        const storyCount = storyFrames?.length || 1;
        return (
          <div className="ig-preview-media-container ig-preview-aspect-reel">
            <div className="ig-preview-story-progress-container">
              {Array.from({ length: storyCount }).map((_, i) => (
                <div key={i} className="ig-preview-story-progress-bar">
                  <div className={`ig-preview-story-progress-fill ${i === 0 ? 'ig-preview-story-progress-active' : ''}`} />
                </div>
              ))}
            </div>
            <div className="ig-preview-story-content">
              {firstStoryFrame && (
                <>
                  <div className="ig-preview-story-text-overlay">
                    <p>{firstStoryFrame.textOverlay}</p>
                  </div>
                  {firstStoryFrame.interactiveElement && (
                    <div className="ig-preview-story-interactive">
                      <span className="ig-preview-story-interactive-type">{firstStoryFrame.interactiveElement.type}</span>
                      <p className="ig-preview-story-interactive-prompt">{firstStoryFrame.interactiveElement.prompt}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      case 'SINGLE_IMAGE':
      case 'INFOGRAPHIC':
      default:
        return (
          <div className="ig-preview-media-container ig-preview-aspect-square">
            <div className="ig-preview-single-image-content">
              <p className="ig-preview-visual-placeholder">Visual Placeholder</p>
            </div>
          </div>
        );
    }
  };

  const renderCaption = () => {
    const isLongCaption = caption.length > 125;
    const displayCaption = isLongCaption && !isCaptionExpanded 
      ? `${caption.substring(0, 125)}...` 
      : caption;

    return (
      <div className="ig-preview-caption-container">
        <span className="ig-preview-caption-username">{username}</span>{' '}
        <span className="ig-preview-caption-text">{displayCaption}</span>
        
        {isLongCaption && !isCaptionExpanded && (
          <button 
            className="ig-preview-more-btn"
            onClick={() => setIsCaptionExpanded(true)}
          >
            more
          </button>
        )}
        
        {(isCaptionExpanded || !isLongCaption) && hashtags.length > 0 && (
          <div className="ig-preview-hashtags">
            {hashtags.map((tag, idx) => (
              <span key={idx} className="ig-preview-hashtag">
                {tag.startsWith('#') ? tag : `#${tag}`}{' '}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="ig-preview-card">
      {/* Header */}
      <div className="ig-preview-header">
        <div className="ig-preview-header-left">
          <div className="ig-preview-avatar">
            {profileImageUrl ? (
              <img src={profileImageUrl} alt={`${username}'s avatar`} className="ig-preview-avatar-img" />
            ) : (
              <div className="ig-preview-avatar-initials">{getInitials(username)}</div>
            )}
          </div>
          <div className="ig-preview-user-info">
            <div className="ig-preview-username">{username}</div>
            {location && <div className="ig-preview-location">{location}</div>}
          </div>
        </div>
        <button className="ig-preview-more-options" title="Preview only">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Media */}
      {renderMedia()}

      {/* Actions */}
      <div className="ig-preview-actions">
        <div className="ig-preview-actions-left">
          <button className="ig-preview-action-btn" title="Preview only"><Heart size={24} /></button>
          <button className="ig-preview-action-btn" title="Preview only"><MessageCircle size={24} /></button>
          <button className="ig-preview-action-btn" title="Preview only"><Send size={24} /></button>
        </div>
        <div className="ig-preview-actions-right">
          <button className="ig-preview-action-btn" title="Preview only"><Bookmark size={24} /></button>
        </div>
      </div>

      {/* Caption Area */}
      {renderCaption()}

      {/* Meta Info */}
      <div className="ig-preview-meta">
        <div className="ig-preview-char-count">
          {caption.length} / 2,200 characters
        </div>
        <div className="ig-preview-timestamp">
          Draft preview
        </div>
      </div>
      
      {/* Simulation Label */}
      <div className="ig-preview-footer">
        Simulation · Not affiliated with Instagram
      </div>
    </div>
  );
}
