interface Props {
  size?: number;
  className?: string;
}

export default function NexusLogo({ size = 32, className = '' }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      fill="none"
      width={size}
      height={size}
      className={className}
    >
      <defs>
        <linearGradient id="nexus-brand" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <rect x="16" y="16" width="480" height="480" rx="96" fill="url(#nexus-brand)" />
      {/* N lines */}
      <line x1="152" y1="144" x2="152" y2="368" stroke="white" strokeWidth="36" strokeLinecap="round" />
      <line x1="360" y1="144" x2="360" y2="368" stroke="white" strokeWidth="36" strokeLinecap="round" />
      <line x1="152" y1="152" x2="360" y2="360" stroke="white" strokeWidth="32" strokeLinecap="round" opacity="0.9" />
      {/* Nodes */}
      <circle cx="152" cy="144" r="24" fill="white" />
      <circle cx="152" cy="368" r="24" fill="white" />
      <circle cx="360" cy="144" r="24" fill="white" />
      <circle cx="360" cy="368" r="24" fill="white" />
      {/* Center nexus */}
      <circle cx="256" cy="256" r="16" fill="white" opacity="0.7" />
    </svg>
  );
}
