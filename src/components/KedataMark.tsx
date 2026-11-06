import React from 'react';

export function KedataMark({ className = '' }: { className?: string }) {
  return <img src="/kedata-mark.svg" alt="" aria-hidden="true" width={40} height={40} className={`cms-brand-mark ${className}`} />;
}
