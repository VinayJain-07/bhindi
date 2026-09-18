'use client';

import React from 'react';
import { Smartphone, Monitor, Tablet } from 'lucide-react';

/* --------------------------------------------------------------------------
   Device Frame
   Wraps content in a phone/tablet/desktop frame for platform-native previews.
   Pure CSS — no images.
   -------------------------------------------------------------------------- */

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface DeviceFrameProps {
  /** Which device frame to render */
  device: DeviceType;
  /** Content to display inside the frame */
  children: React.ReactNode;
  /** Optional width override */
  width?: number;
  /** Optional height override */
  height?: number;
  /** Show device toolbar/controls */
  showControls?: boolean;
  /** Additional class name */
  className?: string;
}

const DEVICE_DEFAULTS: Record<DeviceType, { width: number; height: number }> = {
  mobile: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 800 },
};

export function DeviceFrame({
  device,
  children,
  width,
  height,
  showControls = true,
  className = '',
}: DeviceFrameProps) {
  const dims = DEVICE_DEFAULTS[device];
  const w = width || dims.width;
  const h = height || dims.height;

  return (
    <div className={`sc-device-frame sc-device-frame--${device} ${className}`}>
      {/* Device chrome */}
      {showControls && device === 'mobile' && (
        <div className="sc-device-frame__notch">
          <div className="sc-device-frame__notch-pill" />
        </div>
      )}
      {showControls && device === 'desktop' && (
        <div className="sc-device-frame__toolbar">
          <div className="sc-device-frame__dots">
            <span className="sc-device-frame__dot sc-device-frame__dot--red" />
            <span className="sc-device-frame__dot sc-device-frame__dot--yellow" />
            <span className="sc-device-frame__dot sc-device-frame__dot--green" />
          </div>
          <div className="sc-device-frame__address-bar">
            <span className="sc-device-frame__url-text">preview</span>
          </div>
        </div>
      )}

      {/* Content viewport */}
      <div
        className="sc-device-frame__viewport"
        style={{
          width: `${w}px`,
          maxHeight: `${h}px`,
        }}
      >
        {children}
      </div>

      {/* Mobile home indicator */}
      {showControls && device === 'mobile' && (
        <div className="sc-device-frame__home-indicator">
          <div className="sc-device-frame__home-bar" />
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Device Switcher
   Toggle between mobile/tablet/desktop views
   -------------------------------------------------------------------------- */

export interface DeviceSwitcherProps {
  /** Currently selected device */
  active: DeviceType;
  /** Callback when device changes */
  onChange: (device: DeviceType) => void;
  /** Available device options */
  devices?: DeviceType[];
  /** Additional class name */
  className?: string;
}

export function DeviceSwitcher({
  active,
  onChange,
  devices = ['mobile', 'desktop'],
  className = '',
}: DeviceSwitcherProps) {
  const icons: Record<DeviceType, React.ReactNode> = {
    mobile: <Smartphone size={15} />,
    tablet: <Tablet size={15} />,
    desktop: <Monitor size={15} />,
  };

  const labels: Record<DeviceType, string> = {
    mobile: 'Mobile',
    tablet: 'Tablet',
    desktop: 'Desktop',
  };

  return (
    <div className={`sc-device-switcher ${className}`} role="radiogroup" aria-label="Device preview">
      {devices.map(device => (
        <button
          key={device}
          className={`sc-device-switcher__btn ${
            active === device ? 'sc-device-switcher__btn--active' : ''
          }`}
          onClick={() => onChange(device)}
          role="radio"
          aria-checked={active === device}
          aria-label={labels[device]}
          title={labels[device]}
        >
          {icons[device]}
          <span className="sc-device-switcher__label">{labels[device]}</span>
        </button>
      ))}
    </div>
  );
}

export default DeviceFrame;
