import type { SVGProps } from "react";

// Minimal stroke icons (24px grid), so we don't need an icon library for a handful of glyphs.
function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      width={20}
      height={20}
      {...props}
    >
      {children}
    </svg>
  );
}

type P = SVGProps<SVGSVGElement>;

export const PhoneIcon = (p: P) => (
  <Icon {...p}>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
  </Icon>
);

export const PhoneOffIcon = (p: P) => (
  <Icon {...p}>
    <path d="M10.7 13.3a16 16 0 0 0 3.3 2.5l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-3.3-2.7m-2.7-3.4A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8" />
    <path d="M22 2 2 22" />
  </Icon>
);

export const VideoIcon = (p: P) => (
  <Icon {...p}>
    <path d="m16 13 5.2 3.5a.5.5 0 0 0 .8-.4V7.9a.5.5 0 0 0-.8-.4L16 11" />
    <rect x="2" y="6" width="14" height="12" rx="2" />
  </Icon>
);

export const VideoOffIcon = (p: P) => (
  <Icon {...p}>
    <path d="M10.7 6H14a2 2 0 0 1 2 2v3.3l1 1L22 8v8" />
    <path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2" />
    <path d="M2 2l20 20" />
  </Icon>
);

export const MicIcon = (p: P) => (
  <Icon {...p}>
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
  </Icon>
);

export const MicOffIcon = (p: P) => (
  <Icon {...p}>
    <path d="M2 2l20 20M18.9 13A7 7 0 0 0 19 12v-2M5 10v2a7 7 0 0 0 12 5M15 9.3V5a3 3 0 0 0-5.7-1.3M9 9v3a3 3 0 0 0 5.1 2.1M12 19v3" />
  </Icon>
);

export const SendIcon = (p: P) => (
  <Icon {...p}>
    <path d="M14.5 21.7a.5.5 0 0 0 .9 0L22 2.6a.5.5 0 0 0-.6-.6L2.3 8.6a.5.5 0 0 0 0 .9l8 3.2a2 2 0 0 1 1.1 1.1z" />
    <path d="m21.9 2.1-10.9 11" />
  </Icon>
);
