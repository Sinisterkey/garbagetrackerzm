import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-full w-full", className)}
      aria-hidden="true"
    >
      <path
        d="M9 6.5h14l-1.4 3H10.4L9 6.5Z"
        fill="currentColor"
        opacity="0.35"
      />
      <path
        d="M7.5 10h17l-1.6 14.2a2.5 2.5 0 0 1-2.49 2.22H11.6a2.5 2.5 0 0 1-2.49-2.22L7.5 10Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M13 14.5v7.5M16 14.5v7.5M19 14.5v7.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}