import React from 'react';

export function KedataMark({ className = '' }: { className?: string }) {
  return <img src="/kedata-mark.svg" alt="" aria-hidden="true" width={40} height={40} className={`cms-brand-mark ${className}`} />;
}

export function KedataWordmark({
  className = '',
  cmsLabel = 'CMS',
}: {
  className?: string;
  cmsLabel?: string;
}) {
  return (
    <span
      className={`cms-wordmark inline-flex flex-row items-baseline whitespace-nowrap leading-none select-none ${className}`}
      style={{
        display: 'inline-flex',
        flexDirection: 'row',
        alignItems: 'baseline',
        whiteSpace: 'nowrap',
        lineHeight: 1,
      }}
      aria-label={cmsLabel ? `Kedata ${cmsLabel}` : 'Kedata'}
    >
      <svg
        viewBox="12 10 48 44"
        width={23}
        height={21}
        fill="none"
        aria-hidden="true"
        className="cms-wordmark-k inline-block shrink-0"
        style={{
          display: 'inline-block',
          width: '1.05em',
          height: '0.96em',
          flexShrink: 0,
          transform: 'translateY(0.03em)',
        }}
      >
        <path d="M12 10h12v44H12z" fill="#445867" />
        <path d="M28 30 45 10h15L41 32l19 22H45L28 34v-4Z" fill="#6C7A89" />
        <path d="M12 10h12v12H12z" fill="#A6B8B0" />
      </svg>
      <span
        className="cms-wordmark-text inline-flex flex-row items-baseline"
        style={{
          display: 'inline-flex',
          flexDirection: 'row',
          alignItems: 'baseline',
          marginLeft: '-0.03em',
        }}
        aria-hidden="true"
      >
        <span className="cms-wordmark-edata font-bold" style={{ letterSpacing: '-0.035em' }}>
          edata
        </span>
        {cmsLabel && (
          <span
            className="cms-wordmark-suffix font-semibold"
            style={{ marginLeft: '0.26em', fontSize: '0.78em', letterSpacing: '0.04em' }}
          >
            {cmsLabel}
          </span>
        )}
      </span>
    </span>
  );
}
