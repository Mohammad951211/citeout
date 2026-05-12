import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type BadgeVariant = "q1" | "q2" | "q3" | "q4" | "unranked" | "default" | "success" | "error";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  q1: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  q2: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  q3: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  q4: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  unranked: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  default: "bg-[var(--border)] text-[var(--text-secondary)]",
  success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  error: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
