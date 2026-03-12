import React from 'react';

/**
 * M-Pesa Icon Component
 * Custom icon for M-Pesa payment method
 */
export function MpesaIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* M-Pesa logo inspired icon */}
      <circle cx="12" cy="12" r="11" fill="#4CAF50" />
      <path 
        d="M7 16.5C7 15.12 8.12 14 9.5 14H14.5C15.88 14 17 15.12 17 16.5V17H7V16.5Z" 
        fill="white"
      />
      <path 
        d="M17 10.5C17 9.12 15.88 8 14.5 8H9.5C8.12 8 7 9.12 7 10.5V11H17V10.5Z" 
        fill="white"
      />
      <path 
        d="M7 7H17V8H7V7Z" 
        fill="white"
      />
      <path 
        d="M7 16.5C7 18.43 8.57 20 10.5 20H13.5C15.43 20 17 18.43 17 16.5" 
        stroke="white" 
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default MpesaIcon;
