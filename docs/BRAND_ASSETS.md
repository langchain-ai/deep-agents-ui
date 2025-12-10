# SeenOS 品牌图片资源指南

## 📋 概述

本文档描述 SeenOS 项目的所有图片资源需求、已完成的工作和待办建议。

---

## ✅ 已创建的图片资源

### 1. Logo 系列

| 文件 | 尺寸 | 用途 | 位置 |
|------|------|------|------|
| `logo.svg` | 200x200 | 主 Logo，亮色主题 | `/public/logo.svg` |
| `logo-dark.svg` | 200x200 | 主 Logo，暗色主题 | `/public/logo-dark.svg` |
| `logo-icon.svg` | 64x64 | 小尺寸图标版本 | `/public/logo-icon.svg` |

**设计概念**: 
- **"眼睛"概念** - 代表 "Seen" (看见/观察)
- **电路图案** - 代表 OS/技术/AI
- **渐变配色** - 使用项目主题色 Teal (`hsl(173, 58%, 35%)`)

### 2. Favicon 系列

| 文件 | 尺寸 | 用途 |
|------|------|------|
| `favicon.svg` | 32x32 | 浏览器标签页图标 |
| `apple-touch-icon.svg` | 180x180 | iOS 主屏幕图标 |

### 3. 社交分享图片

| 文件 | 尺寸 | 用途 |
|------|------|------|
| `og-image.svg` | 1200x630 | Open Graph 社交分享预览图 |

### 4. 组件

| 文件 | 描述 |
|------|------|
| `SeenOSLogo.tsx` | React Logo 组件，支持主题切换 |

---

## 🔧 需要手动生成的资源

由于 AI 无法直接生成位图格式，以下资源需要手动处理：

### 1. PNG 格式 Favicon (必须)

大多数浏览器需要 `.ico` 或 `.png` 格式的 favicon。

**生成步骤**:
```bash
# 方法1: 使用 Inkscape (推荐)
inkscape -w 16 -h 16 public/favicon.svg -o public/favicon-16x16.png
inkscape -w 32 -h 32 public/favicon.svg -o public/favicon-32x32.png
inkscape -w 180 -h 180 public/apple-touch-icon.svg -o public/apple-touch-icon.png

# 方法2: 使用 ImageMagick
convert -background none public/favicon.svg -resize 32x32 public/favicon-32x32.png

# 方法3: 使用在线工具
# - https://realfavicongenerator.net/
# - https://favicon.io/
```

**或者使用在线转换**:
1. 打开 https://cloudconvert.com/svg-to-png
2. 上传 `favicon.svg`
3. 设置尺寸为 32x32 和 16x16
4. 下载并保存到 `/public/` 目录

### 2. PNG 格式 OG 图片 (重要)

社交平台（Twitter、Facebook、LinkedIn）需要 PNG 格式的 OG 图片。

**生成步骤**:
```bash
# 使用 Inkscape
inkscape -w 1200 -h 630 public/og-image.svg -o public/og-image.png

# 使用在线工具
# - https://www.adobe.com/express/feature/image/convert/svg-to-png
```

### 3. ICO 格式 Favicon (可选但推荐)

为了最大兼容性，可以生成 `.ico` 文件：

```bash
# 使用 ImageMagick
convert public/favicon-32x32.png public/favicon-16x16.png public/favicon.ico

# 或使用在线工具
# - https://favicon.io/favicon-converter/
```

---

## 📝 建议添加的资源

### 高优先级

| 资源 | 用途 | 建议规格 |
|------|------|----------|
| `logo-horizontal.svg` | 水平排列的 Logo + 文字 | 300x60 |
| `logo-white.svg` | 纯白色版本，用于深色背景 | 200x200 |
| `loading-spinner.svg` | 品牌风格的加载动画 | 48x48 |

### 中等优先级

| 资源 | 用途 | 建议规格 |
|------|------|----------|
| `empty-state.svg` | 空状态插图 | 200x200 |
| `error-illustration.svg` | 错误页面插图 | 300x200 |
| `welcome-banner.svg` | 欢迎/引导页 Banner | 600x300 |

### 低优先级

| 资源 | 用途 | 建议规格 |
|------|------|----------|
| `avatar-placeholder.svg` | 默认用户头像 | 64x64 |
| `file-type-icons/` | 文件类型图标集 | 24x24 各种 |
| `status-icons/` | 状态图标集 | 16x16 各种 |

---

## 🎨 品牌色彩规范

### 主要颜色

| 名称 | 亮色模式 | 暗色模式 | 用途 |
|------|----------|----------|------|
| Primary | `hsl(173, 58%, 35%)` | `hsl(174, 72%, 56%)` | 主要操作、强调色 |
| Background | `#f9f9f9` | `#0f0f0f` | 页面背景 |
| Surface | `#ffffff` | `#1a1a1a` | 卡片背景 |
| Text Primary | `#111827` | `#f3f4f6` | 主要文字 |
| Text Secondary | `#6b7280` | `#9ca3af` | 次要文字 |

### Logo 专用颜色

| 颜色 | HEX | 用途 |
|------|-----|------|
| Teal 深色 | `#1c3c3c` | Logo 核心、暗部 |
| Teal 亮色 | `#2dd4bf` | Logo 渐变、亮部 |
| Cyan | `#3fcdd6` | 渐变过渡 |
| Teal Light | `#5eead4` | 暗色主题高亮 |

---

## 🔗 相关页面分析

### 使用 Logo 的页面

| 页面 | 当前状态 | Logo 类型 |
|------|----------|-----------|
| `/login` | ✅ 已更新 | 主 Logo (80x80) |
| `/register` | ✅ 已更新 | 主 Logo (80x80) |
| `/` (主页) | ✅ 已更新 | 图标版本 (28x28) |

### 潜在需要图片的页面

| 页面/组件 | 图片需求 | 优先级 |
|-----------|----------|--------|
| 404 页面 | 错误插图 | 中 |
| 空聊天状态 | 欢迎插图 | 中 |
| 设置页面 | 各标签图标 | 低 (已用 Lucide) |
| 加载状态 | 品牌 Spinner | 低 |

---

## 📦 文件结构

```
public/
├── logo.svg              # 主 Logo (亮色)
├── logo-dark.svg         # 主 Logo (暗色)
├── logo-icon.svg         # 图标版本
├── favicon.svg           # Favicon SVG
├── favicon.ico           # Favicon ICO (待生成)
├── favicon-16x16.png     # Favicon 16px (待生成)
├── favicon-32x32.png     # Favicon 32px (待生成)
├── apple-touch-icon.svg  # Apple Touch Icon SVG
├── apple-touch-icon.png  # Apple Touch Icon PNG (待生成)
├── og-image.svg          # OG 图片 SVG
├── og-image.png          # OG 图片 PNG (待生成)
└── (原有文件...)

src/app/components/
└── SeenOSLogo.tsx        # Logo React 组件
```

---

## 🚀 快速开始

### 1. 生成必要的 PNG 文件

```bash
# 如果安装了 Inkscape
cd /path/to/project

# Favicon PNGs
inkscape -w 16 -h 16 public/favicon.svg -o public/favicon-16x16.png
inkscape -w 32 -h 32 public/favicon.svg -o public/favicon-32x32.png

# Apple Touch Icon
inkscape -w 180 -h 180 public/apple-touch-icon.svg -o public/apple-touch-icon.png

# OG Image
inkscape -w 1200 -h 630 public/og-image.svg -o public/og-image.png
```

### 2. 更新 metadata (如果添加了 PNG)

在 `src/app/layout.tsx` 中更新 icons 配置：

```typescript
icons: {
  icon: [
    { url: "/favicon.svg", type: "image/svg+xml" },
    { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
  ],
  apple: [
    { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  ],
},
```

---

## 📞 设计工具推荐

如果需要进一步自定义设计：

1. **Figma** - 免费在线设计工具，适合 Logo 和 UI 设计
2. **Inkscape** - 免费开源 SVG 编辑器
3. **Adobe Illustrator** - 专业矢量设计软件
4. **Canva** - 简单易用的在线设计工具

---

*最后更新: 2025-12-10*
