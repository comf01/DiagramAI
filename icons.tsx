import type { ReactNode } from "react";

interface IconProps {
  size?: number;
  className?: string;
}

function I({
  size = 16,
  className,
  children,
  filled = false,
}: IconProps & { children: ReactNode; filled?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const IconCursor = (p: IconProps) => (
  <I {...p} filled>
    <path d="M6 3l12 8.6-6.9.9L13.6 19l-2.4 1-2.6-6.6L6 15.6V3z" />
  </I>
);

export const IconHand = (p: IconProps) => (
  <I {...p}>
    <path d="M8.5 11.5V6.6a1.4 1.4 0 0 1 2.8 0v4.2m0-5.4a1.4 1.4 0 0 1 2.8 0v5.4m0-3.6a1.4 1.4 0 0 1 2.8 0v6.6c0 3.6-2.4 6.2-6 6.2-3 0-4.5-1.5-5.9-3.9l-1.7-3a1.5 1.5 0 0 1 2.5-1.6l1.2 1.6" />
  </I>
);

export const IconNodePlus = (p: IconProps) => (
  <I {...p}>
    <circle cx="9" cy="9" r="5.4" />
    <path d="M17.5 14v6M14.5 17h6" />
  </I>
);

export const IconLink = (p: IconProps) => (
  <I {...p}>
    <path d="M9.6 14.4l4.8-4.8" />
    <path d="M8.2 10.8l-2.5 2.5a3.9 3.9 0 0 0 5.5 5.5l2.5-2.5" />
    <path d="M15.8 13.2l2.5-2.5a3.9 3.9 0 0 0-5.5-5.5l-2.5 2.5" />
  </I>
);

export const IconWand = (p: IconProps) => (
  <I {...p}>
    <path d="M4.5 19.5L14.6 9.4" />
    <path d="M14.5 3.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z" />
    <path d="M19.5 11.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6.6-1.4z" />
  </I>
);

export const IconUndo = (p: IconProps) => (
  <I {...p}>
    <path d="M8 5L4 9l4 4" />
    <path d="M4 9h9.5a5.5 5.5 0 1 1 0 11H10" />
  </I>
);

export const IconRedo = (p: IconProps) => (
  <I {...p}>
    <path d="M16 5l4 4-4 4" />
    <path d="M20 9h-9.5a5.5 5.5 0 1 0 0 11H14" />
  </I>
);

export const IconDownload = (p: IconProps) => (
  <I {...p}>
    <path d="M12 4v10M8 10.5l4 4 4-4" />
    <path d="M5 19.5h14" />
  </I>
);

export const IconChevronLeft = (p: IconProps) => (
  <I {...p}>
    <path d="M14.5 6l-6 6 6 6" />
  </I>
);

export const IconChevronDown = (p: IconProps) => (
  <I {...p}>
    <path d="M6 9.5l6 6 6-6" />
  </I>
);

export const IconTrash = (p: IconProps) => (
  <I {...p}>
    <path d="M4.5 7h15M10 7V5h4v2" />
    <path d="M7.5 7l1 12.5h7l1-12.5" />
    <path d="M10.3 11v5M13.7 11v5" />
  </I>
);

export const IconCopy = (p: IconProps) => (
  <I {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
  </I>
);

export const IconZoomIn = (p: IconProps) => (
  <I {...p}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M20 20l-4.8-4.8M10.5 8v5M8 10.5h5" />
  </I>
);

export const IconZoomOut = (p: IconProps) => (
  <I {...p}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M20 20l-4.8-4.8M8 10.5h5" />
  </I>
);

export const IconFrame = (p: IconProps) => (
  <I {...p}>
    <path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9" />
    <path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9" />
    <path d="M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15" />
    <path d="M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15" />
  </I>
);

export const IconPanel = (p: IconProps) => (
  <I {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <path d="M9.5 4.5v15" />
  </I>
);

export const IconCheck = (p: IconProps) => (
  <I {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </I>
);

export const IconAlert = (p: IconProps) => (
  <I {...p}>
    <path d="M12 4L2.8 19.5h18.4L12 4z" />
    <path d="M12 10v4M12 16.8v.2" />
  </I>
);

export const IconArrowRight = (p: IconProps) => (
  <I {...p}>
    <path d="M4.5 12h15M13.5 6l6 6-6 6" />
  </I>
);

export const IconReverse = (p: IconProps) => (
  <I {...p}>
    <path d="M6.5 8H19l-3.2-3.2M17.5 16H5l3.2 3.2" />
  </I>
);

export const IconPlus = (p: IconProps) => (
  <I {...p}>
    <path d="M12 5v14M5 12h14" />
  </I>
);

export const IconMinus = (p: IconProps) => (
  <I {...p}>
    <path d="M5 12h14" />
  </I>
);

export const IconShapeCircle = (p: IconProps) => (
  <I {...p}>
    <circle cx="12" cy="12" r="7.5" />
  </I>
);

export const IconShapeRect = (p: IconProps) => (
  <I {...p}>
    <rect x="4.5" y="6.5" width="15" height="11" rx="2.5" />
  </I>
);

export const IconShapePill = (p: IconProps) => (
  <I {...p}>
    <rect x="3.5" y="8" width="17" height="8" rx="4" />
  </I>
);

export const IconShapeDiamond = (p: IconProps) => (
  <I {...p}>
    <path d="M12 3.5L20.5 12 12 20.5 3.5 12 12 3.5z" />
  </I>
);

export const IconSpark = (p: IconProps) => (
  <I {...p}>
    <path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6L12 4z" />
    <path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8z" />
  </I>
);

export const LogoMark = ({ size = 26 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <rect width="32" height="32" rx="8" fill="#121A2B" stroke="#273350" />
    <path
      d="M13 18.5L19.5 11.5"
      stroke="#55617F"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <circle cx="10" cy="21.5" r="4" fill="#FF7A66" />
    <circle cx="22.5" cy="9" r="4.5" fill="#FFB224" />
    <circle cx="23" cy="21" r="3.2" fill="#35D3C0" />
  </svg>
);
