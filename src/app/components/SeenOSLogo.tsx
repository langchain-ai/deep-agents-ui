"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

interface SeenOSLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textSize?: "sm" | "md" | "lg" | "xl" | "2xl";
}

/**
 * SeenOS Logo 组件
 * 支持亮色/暗色主题自动切换
 */
export function SeenOSLogo({ 
  size = 64, 
  className = "", 
  showText = false,
  textSize = "2xl"
}: SeenOSLogoProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // 检查当前主题
    const checkTheme = () => {
      const isDarkMode = document.documentElement.classList.contains("dark") ||
        document.documentElement.getAttribute("data-joy-color-scheme") === "dark";
      setIsDark(isDarkMode);
    };

    checkTheme();

    // 监听主题变化
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-joy-color-scheme"],
    });

    return () => observer.disconnect();
  }, []);

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-xl",
    "2xl": "text-2xl",
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Image
        src={isDark ? "/logo-dark.svg" : "/logo.svg"}
        alt="SeenOS Logo"
        width={size}
        height={size}
        priority
      />
      {showText && (
        <span className={`font-bold text-foreground ${textSizeClasses[textSize]}`}>
          SeenOS
        </span>
      )}
    </div>
  );
}

/**
 * SeenOS Icon 组件 - 小尺寸图标版本
 */
export function SeenOSIcon({ 
  size = 32, 
  className = "" 
}: { 
  size?: number; 
  className?: string;
}) {
  return (
    <Image
      src="/logo-icon.svg"
      alt="SeenOS"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}
