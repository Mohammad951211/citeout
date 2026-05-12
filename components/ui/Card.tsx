import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export function Card({ className, hover, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6",
        hover && "transition-colors duration-150 hover:border-brand/30 cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
