import React from 'react';

interface WarningBannerProps {
  message: string;
  onDismiss?: () => void;
}

const WarningBanner: React.FC<WarningBannerProps> = ({ message, onDismiss }) => {
  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-800">
      <svg
        className="flex-shrink-0 w-5 h-5 mt-0.5 text-amber-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01M10.29 3.86l-8.6 14.86A1 1 0 002.56 20h18.88a1 1 0 00.87-1.28l-8.6-14.86a1 1 0 00-1.72 0z"
        />
      </svg>
      <p className="flex-1 text-sm font-medium">{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-amber-600 hover:text-amber-800"
          aria-label="Zavřít"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default WarningBanner;
