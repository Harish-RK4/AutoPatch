import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "warning" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const base = "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-xs";
  
  const sizeClasses = {
    sm: "px-2.5 py-1 text-xs",
    md: "px-3.5 py-1.5 text-xs",
    lg: "px-4 py-2 text-sm",
  };

  const variantClasses = {
    // Condition 1: Primary Accent uses Ink-Teal (#0F766E / #14B8A6)
    primary: "bg-[#0F766E] hover:bg-[#115E59] text-white focus:ring-[#0F766E] dark:bg-[#14B8A6] dark:hover:bg-[#0D9488] dark:text-[#0C0A09]",
    secondary: "bg-[#FFFFFF] dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] text-[#1C1917] dark:text-[#F5F5F4] hover:bg-[#FAF9F6] dark:hover:bg-[#1C1917]",
    danger: "bg-[#EF4444] hover:bg-[#DC2626] text-white focus:ring-[#EF4444]",
    warning: "bg-[#F59E0B] hover:bg-[#D97706] text-[#1C1917] focus:ring-[#F59E0B]",
    ghost: "bg-transparent text-[#78716C] dark:text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-[#F5F5F4] hover:bg-black/5 dark:hover:bg-white/5",
  };

  return (
    <button
      className={`${base} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
