# ZapCut - Desktop Video Editor
## Product Requirements Document (PRD)

**Version:** 1.0  
**Last Updated:** October 28, 2025  
**Project Type:** Desktop Application (Cross-Platform)  
**Status:** Planning Phase  
**Website:** https://zapcut.archlife.org  
**Repository:** https://github.com/Zernach/zapcut

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Product Vision & Objectives](#product-vision--objectives)
3. [Target Users](#target-users)
4. [Technical Architecture](#technical-architecture)
5. [Component Architecture](#component-architecture)
6. [Functional Requirements](#functional-requirements)
7. [Non-Functional Requirements](#non-functional-requirements)
8. [User Experience Specifications](#user-experience-specifications)
9. [Development Phases](#development-phases)
10. [Success Metrics](#success-metrics)
11. [Risk Assessment & Mitigation](#risk-assessment--mitigation)
12. [Dependencies & Integrations](#dependencies--integrations)

---

## Executive Summary

**ZapCut** is a high-performance, native desktop video editor designed for creators who need speed and simplicity. Built on Tauri (Rust backend) and React (frontend), ZapCut provides essential video editing capabilities: screen recording, webcam capture, clip arrangement, timeline editing, and professional video export.

**Project Links:**
- Website: https://zapcut.archlife.org
- GitHub: https://github.com/Zernach/zapcut

### Key Differentiators
- **Performance-First Architecture**: Rust backend ensures blazing-fast operations
- **Streamlined UX**: Focus on core editing loop (Record → Import → Arrange → Export)
- **Native Integration**: True desktop app with OS-level features (not Electron bloat)
- **Minimal Learning Curve**: Essential features only, no overwhelming toolbars

---

## Product Vision & Objectives

### Vision Statement
"Empower every creator to produce professional-quality videos with zero friction and maximum speed."

### Primary Objectives
1. **Speed**: App launch < 5 seconds, timeline responsive with 10+ clips, 30fps preview playback
2. **Simplicity**: Users can complete their first edit within 5 minutes of installation
3. **Reliability**: Zero crashes during export, no memory leaks in extended sessions
4. **Native Performance**: Leverage Rust for computational tasks, OS APIs for media access

### Success Definition
- MVP completion with all core features functional
- Successful export of multi-clip videos without quality degradation
- Cross-platform builds (macOS and Windows) from single codebase
- User can complete all 6 usage scenarios without bugs

---

## Target Users

### Primary Persona: "Alex the Content Creator"
- **Age**: 22-35
- **Occupation**: YouTuber, course creator, social media influencer
- **Pain Points**:
  - DaVinci Resolve is too complex and resource-heavy
  - Online editors require internet and are slow
  - iMovie lacks professional features
  - Adobe Premiere is expensive and overkill for simple edits
- **Needs**:
  - Record screen + webcam simultaneously
  - Quick trimming and arrangement
  - Fast exports for uploading content
  - No subscription fees

### Secondary Persona: "Sam the Educator"
- **Age**: 30-50
- **Occupation**: Teacher, online instructor, trainer
- **Pain Points**:
  - Need to create tutorial videos quickly
  - Limited technical skills for complex editors
  - School budget constraints
- **Needs**:
  - Simple screen recording
  - Basic editing (trim, split, arrange)
  - Export in standard formats

---

## Technical Architecture

### Stack Overview

#### Frontend Layer
- **Framework**: React 18+ with TypeScript
- **State Management**: Zustand (lightweight, performant)
- **Timeline UI**: react-konva (Canvas-based for performance)
- **Video Player**: Native HTML5 `<video>` element (hardware-accelerated)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Build Tool**: Vite (fast development and HMR)

#### Backend Layer (Rust via Tauri)
- **Desktop Framework**: Tauri 2.x
- **Media Processing**: FFmpeg (invoked via Tauri commands for re-encoding)
- **Screen Capture**:
  - Browser: `navigator.mediaDevices.getDisplayMedia()` (cross-platform)
  - MediaRecorder API for WebM capture
  - Backend FFmpeg re-encodes WebM to MP4 for consistency
- **File System**: Tauri's fs module with proper permissions
- **IPC**: Tauri's command system for frontend-backend communication

#### Recording Architecture (Updated)
**Hybrid Browser + Backend Approach:**
1. Frontend uses `getDisplayMedia()` to capture screen (browser handles permissions)
2. MediaRecorder encodes to WebM format in real-time
3. On stop, WebM chunks sent to Rust backend
4. Backend uses FFmpeg to re-encode WebM → MP4 (better compression, universal compatibility)
5. Final MP4 saved to recordings directory

**Benefits:**
- No system permissions required (browser handles prompts)
- Cross-platform without OS-specific code
- Native browser screen picker with preview
- FFmpeg still used for quality and format consistency

#### Media Processing Pipeline
```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Import  │  │ Timeline │  │  Player  │             │
│  │   UI     │  │   UI     │  │   UI     │             │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘             │
│       │             │              │                    │
└───────┼─────────────┼──────────────┼─────────────────────┘
        │             │              │
        │   Tauri IPC (Commands)     │
        ▼             ▼              ▼
┌─────────────────────────────────────────────────────────┐
│                   Backend (Rust)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │   File   │  │  Media   │  │  Screen  │             │
│  │  Handler │  │Processor │  │ Capture  │             │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘             │
│       │             │              │                    │
│       └─────────────┼──────────────┘                    │
│                     │                                    │
│              ┌──────▼──────┐                            │
│              │   FFmpeg    │                            │
│              │   Engine    │                            │
│              └─────────────┘                            │
└─────────────────────────────────────────────────────────┘
```

### File Structure
```
zapcut/
├── src/                        # React frontend
│   ├── components/             # Reusable UI components
│   │   ├── Timeline/
│   │   │   ├── Timeline.tsx
│   │   │   ├── Clip.tsx
│   │   │   ├── Playhead.tsx
│   │   │   └── Track.tsx
│   │   ├── Player/
│   │   │   ├── VideoPlayer.tsx
│   │   │   └── PlayerControls.tsx
│   │   ├── MediaLibrary/
│   │   │   ├── MediaLibrary.tsx
│   │   │   ├── MediaItem.tsx
│   │   │   └── Thumbnail.tsx
│   │   ├── Recording/
│   │   │   ├── RecordingPanel.tsx
│   │   │   ├── ScreenRecorder.tsx
│   │   │   └── WebcamRecorder.tsx
│   │   └── Export/
│   │       ├── ExportDialog.tsx
│   │       └── ExportProgress.tsx
│   ├── store/                  # State management
│   │   ├── timelineStore.ts
│   │   ├── mediaStore.ts
│   │   ├── playerStore.ts
│   │   └── recordingStore.ts
│   ├── types/                  # TypeScript definitions
│   │   ├── media.ts
│   │   ├── timeline.ts
│   │   └── recording.ts
│   ├── utils/                  # Helper functions
│   │   ├── timeUtils.ts
│   │   ├── mediaUtils.ts
│   │   └── formatUtils.ts
│   ├── hooks/                  # Custom React hooks
│   │   ├── useTimeline.ts
│   │   ├── useMediaImport.ts
│   │   └── useVideoExport.ts
│   ├── App.tsx
│   └── main.tsx
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   ├── commands/           # Tauri commands
│   │   │   ├── media.rs
│   │   │   ├── recording.rs
│   │   │   ├── export.rs
│   │   │   └── filesystem.rs
│   │   ├── utils/              # Rust utilities
│   │   │   ├── ffmpeg.rs
│   │   │   └── video_info.rs
│   │   ├── capture/            # Platform-specific capture
│   │   │   ├── mod.rs
│   │   │   ├── macos.rs
│   │   │   └── windows.rs
│   │   └── main.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── public/                     # Static assets
└── package.json
```

### Data Models

#### Clip Model
```typescript
interface Clip {
  id: string;
  name: string;
  filePath: string;
  duration: number;          // seconds
  startTime: number;         // position on timeline
  trimStart: number;         // trim in point
  trimEnd: number;           // trim out point
  trackIndex: number;        // which track (0, 1, 2...)
  width: number;
  height: number;
  fps: number;
  thumbnailPath?: string;
  metadata: ClipMetadata;
}

interface ClipMetadata {
  codec: string;
  bitrate: number;
  audioCodec?: string;
  fileSize: number;
  createdAt: Date;
}
```

#### Timeline State
```typescript
interface TimelineState {
  clips: Clip[];
  currentTime: number;       // playhead position
  duration: number;          // total timeline duration
  zoom: number;              // pixels per second
  tracks: Track[];
  isPlaying: boolean;
  selectedClipIds: string[];
}

interface Track {
  id: string;
  type: 'video' | 'audio' | 'overlay';
  locked: boolean;
  visible: boolean;
  clips: string[];           // clip IDs
}
```

#### Recording Session
```typescript
interface RecordingSession {
  id: string;
  type: 'screen' | 'webcam' | 'screen+webcam';
  status: 'idle' | 'recording' | 'paused' | 'stopped';
  duration: number;
  outputPath?: string;
  settings: RecordingSettings;
}

interface RecordingSettings {
  screenSelection?: 'fullscreen' | 'window' | 'region';
  audioInput: 'microphone' | 'system' | 'both' | 'none';
  quality: 'low' | 'medium' | 'high';
  fps: 30 | 60;
}
```

#### Export Configuration
```typescript
interface ExportConfig {
  outputPath: string;
  resolution: '720p' | '1080p' | '1440p' | '4K' | 'source';
  format: 'mp4' | 'mov' | 'webm';
  codec: 'h264' | 'h265';
  quality: 'low' | 'medium' | 'high';
  fps?: number;
  includeAudio: boolean;
}

interface ExportProgress {
  percentage: number;
  currentFrame: number;
  totalFrames: number;
  estimatedTimeRemaining: number;
  status: 'preparing' | 'encoding' | 'finalizing' | 'complete' | 'error';
  error?: string;
}
```

---

## Component Architecture

### Overview

ZapCut's component architecture is designed with **reusability**, **modularity**, and **performance** as core principles. The architecture follows atomic design methodology with five layers: Atoms, Molecules, Organisms, Templates, and Pages. Each component is built for maximum reusability across the application.

### Atomic Design System

#### Atoms (Basic Building Blocks)
- **Button**: Primary interaction element with variants and states
- **Input**: Text input fields with validation states
- **Slider**: Numeric input via dragging
- **Checkbox**: Binary selection control
- **Radio**: Single selection from group
- **Toggle**: On/off switch control
- **Select**: Dropdown selection
- **Textarea**: Multi-line text input
- **Badge**: Status indicator or label
- **Spinner**: Loading indicator
- **Tooltip**: Contextual help text
- **Icon**: Unified icon component (Lucide)
- **Avatar**: User profile image placeholder
- **Divider**: Visual separator
- **Label**: Form field labels
- **Switch**: Toggle switch variant
- **Progress**: Progress indicator
- **Skeleton**: Loading placeholder
- **Chip**: Small labeled element
- **Tag**: Categorization element

#### Molecules (Simple Combinations)
- **ButtonGroup**: Multiple buttons together
- **InputGroup**: Input with label and validation
- **SearchBox**: Input with search icon and clear
- **Dropdown**: Select with custom styling
- **CheckboxGroup**: Multiple checkboxes
- **RadioGroup**: Multiple radio buttons
- **FormField**: Complete form field with label/error
- **Card**: Content container with header/body/footer
- **ListItem**: List item with icon, text, and actions
- **BreadcrumbItem**: Navigation breadcrumb segment
- **TabItem**: Individual tab element
- **MenuItem**: Menu item with icon and text
- **NotificationItem**: Toast/notification content
- **MediaCard**: Media item with thumbnail and info
- **ControlButton**: Button with icon and tooltip
- **StatusIndicator**: Status with icon and text
- **MetricCard**: Display metric with label and value
- **ActionButton**: Button with loading state
- **FilterChip**: Removable filter element
- **TagInput**: Input for adding tags

#### Organisms (Complex UI Sections)
- **Header**: Application header with navigation
- **Sidebar**: Collapsible sidebar navigation
- **Toolbar**: Action toolbar with grouped controls
- **MediaLibrary**: Complete media management section
- **Timeline**: Full timeline editing interface
- **VideoPlayer**: Complete video playback section
- **RecordingPanel**: Screen/webcam recording interface
- **ExportDialog**: Complete export configuration
- **SettingsPanel**: Application settings interface
- **ProjectManager**: Project file management
- **ClipEditor**: Advanced clip editing tools
- **TrackControls**: Track management controls
- **PlaybackControls**: Complete playback control set
- **ZoomControls**: Timeline zoom and navigation
- **SelectionToolbar**: Context-sensitive actions
- **StatusBar**: Application status information
- **CommandPalette**: Quick command interface
- **HelpPanel**: Contextual help and shortcuts
- **ErrorPanel**: Error display and recovery
- **LoadingPanel**: Application loading states

### Component Hierarchy

```
src/components/
├── atoms/                   # Basic UI building blocks
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx
│   │   ├── Button.stories.tsx
│   │   └── index.ts
│   ├── Input/
│   ├── Slider/
│   ├── Checkbox/
│   ├── Radio/
│   ├── Toggle/
│   ├── Select/
│   ├── Textarea/
│   ├── Badge/
│   ├── Spinner/
│   ├── Tooltip/
│   ├── Icon/
│   ├── Avatar/
│   ├── Divider/
│   ├── Label/
│   ├── Switch/
│   ├── Progress/
│   ├── Skeleton/
│   ├── Chip/
│   └── Tag/
├── molecules/               # Simple component combinations
│   ├── ButtonGroup/
│   ├── InputGroup/
│   ├── SearchBox/
│   ├── Dropdown/
│   ├── CheckboxGroup/
│   ├── RadioGroup/
│   ├── FormField/
│   ├── Card/
│   ├── ListItem/
│   ├── BreadcrumbItem/
│   ├── TabItem/
│   ├── MenuItem/
│   ├── NotificationItem/
│   ├── MediaCard/
│   ├── ControlButton/
│   ├── StatusIndicator/
│   ├── MetricCard/
│   ├── ActionButton/
│   ├── FilterChip/
│   └── TagInput/
├── organisms/               # Complex UI sections
│   ├── Header/
│   ├── Sidebar/
│   ├── Toolbar/
│   ├── MediaLibrary/
│   ├── Timeline/
│   ├── VideoPlayer/
│   ├── RecordingPanel/
│   ├── ExportDialog/
│   ├── SettingsPanel/
│   ├── ProjectManager/
│   ├── ClipEditor/
│   ├── TrackControls/
│   ├── PlaybackControls/
│   ├── ZoomControls/
│   ├── SelectionToolbar/
│   ├── StatusBar/
│   ├── CommandPalette/
│   ├── HelpPanel/
│   ├── ErrorPanel/
│   └── LoadingPanel/
├── templates/               # Page layout templates
│   ├── MainLayout/
│   ├── RecordingLayout/
│   ├── ExportLayout/
│   ├── SettingsLayout/
│   └── EmptyLayout/
├── pages/                   # Complete page components
│   ├── HomePage/
│   ├── RecordingPage/
│   ├── ExportPage/
│   ├── SettingsPage/
│   └── HelpPage/
├── layout/                  # Structural components
│   ├── Panel/
│   ├── Container/
│   ├── SplitPane/
│   ├── ScrollArea/
│   ├── GridLayout/
│   ├── FlexLayout/
│   ├── Window/
│   ├── ResizablePanel/
│   ├── CollapsiblePanel/
│   ├── TabPanel/
│   ├── Accordion/
│   ├── Stack/
│   ├── Grid/
│   ├── Flex/
│   ├── Spacer/
│   ├── Center/
│   ├── AspectRatio/
│   └── Viewport/
├── feedback/                # User feedback components
│   ├── Toast/
│   ├── Modal/
│   ├── Dialog/
│   ├── Alert/
│   ├── ProgressBar/
│   ├── LoadingOverlay/
│   ├── ErrorBoundary/
│   ├── NotificationCenter/
│   ├── ConfirmationDialog/
│   ├── AlertDialog/
│   ├── ProgressDialog/
│   ├── LoadingSpinner/
│   ├── ErrorMessage/
│   ├── SuccessMessage/
│   ├── WarningMessage/
│   ├── InfoMessage/
│   └── StatusMessage/
├── navigation/              # Navigation components
│   ├── Tabs/
│   ├── Breadcrumb/
│   ├── Menu/
│   ├── Navbar/
│   ├── Sidebar/
│   ├── Pagination/
│   ├── Stepper/
│   ├── Wizard/
│   ├── TabNavigation/
│   ├── MenuDropdown/
│   ├── ContextMenu/
│   ├── ActionMenu/
│   ├── CommandMenu/
│   ├── QuickActions/
│   └── NavigationRail/
├── media/                   # Media-specific components
│   ├── Thumbnail/
│   ├── VideoPreview/
│   ├── AudioWaveform/
│   ├── TimelineRuler/
│   ├── MediaPlayer/
│   ├── ImageViewer/
│   ├── AudioPlayer/
│   ├── VideoControls/
│   ├── AudioControls/
│   ├── MediaInfo/
│   ├── MediaMetadata/
│   ├── MediaThumbnail/
│   ├── MediaPreview/
│   ├── MediaGrid/
│   ├── MediaList/
│   ├── MediaCarousel/
│   └── MediaGallery/
├── timeline/                # Timeline editing components
│   ├── TimelineCanvas/
│   ├── Clip/
│   ├── Track/
│   ├── Playhead/
│   ├── TimeRuler/
│   ├── ZoomSlider/
│   ├── SnapIndicator/
│   ├── TimelineGrid/
│   ├── TimelineTracks/
│   ├── TimelineClips/
│   ├── TimelineControls/
│   ├── TimelineNavigation/
│   ├── TimelineSelection/
│   ├── TimelineScrubber/
│   ├── TimelineMarkers/
│   ├── TimelineLayers/
│   ├── TimelineEffects/
│   ├── TimelineTransitions/
│   ├── TimelineAudio/
│   └── TimelineVideo/
├── player/                  # Video player components
│   ├── VideoPlayer/
│   ├── PlayerControls/
│   ├── SeekBar/
│   ├── VolumeSlider/
│   ├── PlaybackRate/
│   ├── PlayerOverlay/
│   ├── PlayerSettings/
│   ├── PlayerInfo/
│   ├── PlayerProgress/
│   ├── PlayerTime/
│   ├── PlayerSpeed/
│   ├── PlayerQuality/
│   ├── PlayerFullscreen/
│   ├── PlayerPicture/
│   ├── PlayerAudio/
│   ├── PlayerSubtitles/
│   └── PlayerChapters/
├── library/                 # Media library components
│   ├── MediaLibrary/
│   ├── MediaItem/
│   ├── MediaGrid/
│   ├── DropZone/
│   ├── EmptyState/
│   ├── MediaFilter/
│   ├── MediaSearch/
│   ├── MediaSort/
│   ├── MediaView/
│   ├── MediaImport/
│   ├── MediaExport/
│   ├── MediaDelete/
│   ├── MediaRename/
│   ├── MediaProperties/
│   ├── MediaMetadata/
│   ├── MediaThumbnails/
│   ├── MediaPreview/
│   ├── MediaCollection/
│   ├── MediaPlaylist/
│   └── MediaFavorites/
├── recording/               # Recording components
│   ├── RecordingPanel/
│   ├── ScreenSelector/
│   ├── WebcamPreview/
│   ├── RecordingControls/
│   ├── TimerDisplay/
│   ├── RecordingSettings/
│   ├── RecordingPreview/
│   ├── RecordingQuality/
│   ├── RecordingAudio/
│   ├── RecordingVideo/
│   ├── RecordingRegion/
│   ├── RecordingCountdown/
│   ├── RecordingStatus/
│   ├── RecordingProgress/
│   ├── RecordingTimer/
│   ├── RecordingIndicator/
│   └── RecordingOverlay/
├── export/                  # Export components
│   ├── ExportDialog/
│   ├── ExportProgress/
│   ├── ExportSettings/
│   ├── ExportPresets/
│   ├── ExportQuality/
│   ├── ExportFormat/
│   ├── ExportResolution/
│   ├── ExportCodec/
│   ├── ExportAudio/
│   ├── ExportVideo/
│   ├── ExportAdvanced/
│   ├── ExportPreview/
│   ├── ExportQueue/
│   ├── ExportHistory/
│   ├── ExportTemplates/
│   └── ExportValidation/
├── forms/                   # Form components
│   ├── Form/
│   ├── FormField/
│   ├── FormGroup/
│   ├── FormSection/
│   ├── FormValidation/
│   ├── FormSubmit/
│   ├── FormReset/
│   ├── FormError/
│   ├── FormSuccess/
│   ├── FormLoading/
│   ├── FormWizard/
│   ├── FormStepper/
│   ├── FormTabs/
│   ├── FormAccordion/
│   └── FormModal/
├── data/                    # Data display components
│   ├── Table/
│   ├── List/
│   ├── Grid/
│   ├── Card/
│   ├── Chart/
│   ├── Graph/
│   ├── Metric/
│   ├── Stat/
│   ├── KPI/
│   ├── Dashboard/
│   ├── Report/
│   ├── Analytics/
│   ├── Logs/
│   ├── Events/
│   └── Timeline/
├── overlay/                 # Overlay components
│   ├── Modal/
│   ├── Dialog/
│   ├── Popover/
│   ├── Tooltip/
│   ├── Dropdown/
│   ├── ContextMenu/
│   ├── ActionSheet/
│   ├── BottomSheet/
│   ├── SideSheet/
│   ├── Drawer/
│   ├── Overlay/
│   ├── Backdrop/
│   ├── Portal/
│   └── Layer/
├── interactive/             # Interactive components
│   ├── DragDrop/
│   ├── Resizable/
│   ├── Draggable/
│   ├── Droppable/
│   ├── Sortable/
│   ├── Selectable/
│   ├── Editable/
│   ├── Expandable/
│   ├── Collapsible/
│   ├── Toggleable/
│   ├── Clickable/
│   ├── Hoverable/
│   ├── Focusable/
│   ├── Keyboard/
│   └── Gesture/
├── utility/                 # Utility components
│   ├── Icon/
│   ├── KeyboardShortcut/
│   ├── DragHandle/
│   ├── ResizeHandle/
│   ├── Scrollbar/
│   ├── ScrollArea/
│   ├── VirtualList/
│   ├── InfiniteScroll/
│   ├── LazyLoad/
│   ├── Suspense/
│   ├── ErrorBoundary/
│   ├── Portal/
│   ├── Fragment/
│   ├── Provider/
│   ├── Consumer/
│   ├── Context/
│   ├── Hook/
│   └── HOC/
└── shared/                  # Shared utilities
    ├── hooks/
    ├── utils/
    ├── constants/
    ├── types/
    ├── styles/
    ├── themes/
    ├── providers/
    ├── contexts/
    ├── stores/
    ├── services/
    ├── api/
    ├── config/
    └── lib/
```

---

### Component Specifications

#### Atoms (Basic Building Blocks)

##### Button
- **Purpose**: Primary interaction element
- **Variants**: Primary, Secondary, Danger, Ghost, Icon, Link, Outline
- **Sizes**: XS, Small, Medium, Large, XL
- **States**: Default, Hover, Active, Disabled, Loading, Focus
- **Props**: 
  ```typescript
  interface ButtonProps {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon' | 'link' | 'outline';
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    disabled?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
    iconPosition?: 'left' | 'right';
    fullWidth?: boolean;
    onClick?: () => void;
    children?: React.ReactNode;
    className?: string;
    type?: 'button' | 'submit' | 'reset';
  }
  ```
- **Reusability**: Used in 100+ locations (toolbars, dialogs, menus, forms)
- **Accessibility**: ARIA labels, keyboard navigation, focus management

##### Input
- **Purpose**: Text input field with validation
- **Variants**: Text, Number, Password, Search, Email, URL
- **States**: Default, Focus, Error, Disabled, Readonly
- **Props**:
  ```typescript
  interface InputProps {
    type?: 'text' | 'number' | 'password' | 'search' | 'email' | 'url';
    placeholder?: string;
    value?: string;
    onChange?: (value: string) => void;
    error?: string;
    disabled?: boolean;
    readonly?: boolean;
    required?: boolean;
    min?: number;
    max?: number;
    step?: number;
    pattern?: string;
    className?: string;
  }
  ```
- **Reusability**: Forms, dialogs, settings, search
- **Features**: Validation, formatting, auto-complete

##### Slider
- **Purpose**: Numeric input via dragging
- **Variants**: Horizontal, Vertical, Range
- **States**: Default, Dragging, Disabled, Focus
- **Props**:
  ```typescript
  interface SliderProps {
    min: number;
    max: number;
    step?: number;
    value: number | [number, number];
    onChange: (value: number | [number, number]) => void;
    disabled?: boolean;
    orientation?: 'horizontal' | 'vertical';
    marks?: { value: number; label: string }[];
    tooltip?: boolean;
    className?: string;
  }
  ```
- **Reusability**: Zoom control, volume, timeline scrubbing, settings
- **Features**: Keyboard navigation, touch support, tooltips

##### Checkbox
- **Purpose**: Binary selection control
- **States**: Unchecked, Checked, Indeterminate, Disabled, Focus
- **Props**:
  ```typescript
  interface CheckboxProps {
    checked: boolean;
    indeterminate?: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    label?: string;
    description?: string;
    className?: string;
  }
  ```
- **Reusability**: Track visibility toggles, export settings, preferences
- **Features**: Indeterminate state, keyboard support

##### Radio
- **Purpose**: Single selection from group
- **States**: Unselected, Selected, Disabled, Focus
- **Props**:
  ```typescript
  interface RadioProps {
    value: string;
    selected?: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    label?: string;
    description?: string;
    className?: string;
  }
  ```
- **Reusability**: Export format selection, quality presets, settings
- **Features**: Group management, keyboard navigation

##### Toggle Switch
- **Purpose**: On/off toggle control
- **States**: Off, On, Disabled, Focus
- **Props**:
  ```typescript
  interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    label?: string;
    description?: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
  }
  ```
- **Reusability**: Auto-save, advanced settings, feature flags
- **Features**: Smooth animation, keyboard support

##### Select/Dropdown
- **Purpose**: Single/multi selection from list
- **Variants**: Dropdown, Multi-select, Searchable, Creatable
- **States**: Closed, Open, Focus, Disabled, Loading
- **Props**:
  ```typescript
  interface SelectProps {
    options: SelectOption[];
    value?: string | string[];
    onChange: (value: string | string[]) => void;
    multiple?: boolean;
    searchable?: boolean;
    creatable?: boolean;
    disabled?: boolean;
    placeholder?: string;
    className?: string;
  }
  ```
- **Reusability**: Camera selection, quality presets, export formats
- **Features**: Search, keyboard navigation, custom options

##### Textarea
- **Purpose**: Multi-line text input
- **States**: Default, Focus, Error, Disabled, Readonly
- **Props**:
  ```typescript
  interface TextareaProps {
    rows?: number;
    placeholder?: string;
    value?: string;
    onChange?: (value: string) => void;
    error?: string;
    disabled?: boolean;
    readonly?: boolean;
    resize?: 'none' | 'vertical' | 'horizontal' | 'both';
    maxLength?: number;
    className?: string;
  }
  ```
- **Reusability**: Project notes, clip descriptions, comments
- **Features**: Auto-resize, character count, validation

##### Badge
- **Purpose**: Status indicator or label
- **Variants**: Info, Success, Warning, Error, Neutral
- **Props**:
  ```typescript
  interface BadgeProps {
    variant?: 'info' | 'success' | 'warning' | 'error' | 'neutral';
    children: React.ReactNode;
    dot?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
  }
  ```
- **Reusability**: Import status, export status, track labels
- **Features**: Color coding, dot variant

##### Spinner/Loading
- **Purpose**: Loading indicator
- **Variants**: Circle, Bars, Dots, Pulse, Skeleton
- **Props**:
  ```typescript
  interface SpinnerProps {
    variant?: 'circle' | 'bars' | 'dots' | 'pulse' | 'skeleton';
    size?: 'sm' | 'md' | 'lg' | 'xl';
    color?: string;
    speed?: 'slow' | 'normal' | 'fast';
    className?: string;
  }
  ```
- **Reusability**: Import progress, export progress, async operations
- **Features**: Customizable speed, size, color

##### Tooltip
- **Purpose**: Contextual help text
- **Position**: Top, Bottom, Left, Right, Auto
- **Props**:
  ```typescript
  interface TooltipProps {
    content: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
    delay?: number;
    trigger?: 'hover' | 'click' | 'focus';
    disabled?: boolean;
    className?: string;
    children: React.ReactNode;
  }
  ```
- **Reusability**: Icon buttons, keyboard shortcuts, feature explanations
- **Features**: Smart positioning, delay control, multiple triggers

##### Icon
- **Purpose**: Unified icon component (Lucide)
- **Props**:
  ```typescript
  interface IconProps {
    name: string;
    size?: number | string;
    color?: string;
    stroke?: number;
    className?: string;
  }
  ```
- **Reusability**: All icon usage (200+ instances)
- **Features**: Consistent sizing, color theming, stroke control

##### Avatar
- **Purpose**: User profile image placeholder
- **Variants**: Image, Initials, Icon, Placeholder
- **Props**:
  ```typescript
  interface AvatarProps {
    src?: string;
    alt?: string;
    initials?: string;
    icon?: React.ReactNode;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    shape?: 'circle' | 'square';
    className?: string;
  }
  ```
- **Reusability**: User profiles, project avatars, team members
- **Features**: Fallback states, size variants

##### Divider
- **Purpose**: Visual separator
- **Variants**: Horizontal, Vertical, Dashed, Dotted
- **Props**:
  ```typescript
  interface DividerProps {
    orientation?: 'horizontal' | 'vertical';
    variant?: 'solid' | 'dashed' | 'dotted';
    spacing?: 'sm' | 'md' | 'lg';
    className?: string;
  }
  ```
- **Reusability**: Section separators, list dividers, layout structure
- **Features**: Flexible spacing, multiple styles

##### Label
- **Purpose**: Form field labels
- **Variants**: Default, Required, Optional, Disabled
- **Props**:
  ```typescript
  interface LabelProps {
    children: React.ReactNode;
    required?: boolean;
    optional?: boolean;
    disabled?: boolean;
    htmlFor?: string;
    className?: string;
  }
  ```
- **Reusability**: Form fields, settings labels, accessibility
- **Features**: Required indicators, accessibility attributes

##### Switch
- **Purpose**: Toggle switch variant
- **States**: Off, On, Disabled, Focus
- **Props**:
  ```typescript
  interface SwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    label?: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
  }
  ```
- **Reusability**: Settings toggles, feature flags, preferences
- **Features**: Smooth animation, keyboard support

##### Progress
- **Purpose**: Progress indicator
- **Variants**: Linear, Circular, Stepped
- **Props**:
  ```typescript
  interface ProgressProps {
    value: number;
    max?: number;
    variant?: 'linear' | 'circular' | 'stepped';
    showPercentage?: boolean;
    label?: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
  }
  ```
- **Reusability**: Import progress, export progress, loading states
- **Features**: Multiple variants, percentage display

##### Skeleton
- **Purpose**: Loading placeholder
- **Variants**: Text, Rectangle, Circle, Custom
- **Props**:
  ```typescript
  interface SkeletonProps {
    variant?: 'text' | 'rectangle' | 'circle' | 'custom';
    width?: number | string;
    height?: number | string;
    lines?: number;
    className?: string;
  }
  ```
- **Reusability**: Loading states, content placeholders
- **Features**: Flexible sizing, animation

##### Chip
- **Purpose**: Small labeled element
- **Variants**: Default, Removable, Selectable, Filter
- **Props**:
  ```typescript
  interface ChipProps {
    children: React.ReactNode;
    removable?: boolean;
    onRemove?: () => void;
    selectable?: boolean;
    selected?: boolean;
    onClick?: () => void;
    variant?: 'default' | 'outline' | 'filled';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
  }
  ```
- **Reusability**: Tags, filters, selections, categories
- **Features**: Interactive states, removal actions

##### Tag
- **Purpose**: Categorization element
- **Variants**: Default, Colored, Outlined, Filled
- **Props**:
  ```typescript
  interface TagProps {
    children: React.ReactNode;
    color?: string;
    variant?: 'default' | 'outline' | 'filled';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
  }
  ```
- **Reusability**: Categories, status labels, metadata
- **Features**: Color coding, size variants

#### Molecules (Simple Combinations)

##### ButtonGroup
- **Purpose**: Multiple buttons together with consistent spacing
- **Variants**: Horizontal, Vertical, Segmented, Attached
- **Props**:
  ```typescript
  interface ButtonGroupProps {
    orientation?: 'horizontal' | 'vertical';
    variant?: 'default' | 'segmented' | 'attached';
    spacing?: 'sm' | 'md' | 'lg';
    children: React.ReactNode;
    className?: string;
  }
  ```
- **Reusability**: Toolbars, action groups, navigation
- **Features**: Consistent spacing, alignment

##### InputGroup
- **Purpose**: Input with label and validation
- **Variants**: Default, With Icon, With Button, With Addon
- **Props**:
  ```typescript
  interface InputGroupProps {
    label?: string;
    error?: string;
    description?: string;
    required?: boolean;
    icon?: React.ReactNode;
    addon?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
  }
  ```
- **Reusability**: Forms, settings, search
- **Features**: Label association, error display

##### SearchBox
- **Purpose**: Input with search icon and clear
- **Variants**: Default, With Filters, With Suggestions
- **Props**:
  ```typescript
  interface SearchBoxProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    onClear?: () => void;
    onSearch?: (query: string) => void;
    suggestions?: string[];
    filters?: FilterOption[];
    className?: string;
  }
  ```
- **Reusability**: Media library, project search, global search
- **Features**: Auto-complete, filters, keyboard shortcuts

##### Dropdown
- **Purpose**: Select with custom styling
- **Variants**: Default, Multi-select, Searchable, Custom
- **Props**:
  ```typescript
  interface DropdownProps {
    options: DropdownOption[];
    value?: string | string[];
    onChange: (value: string | string[]) => void;
    placeholder?: string;
    multiple?: boolean;
    searchable?: boolean;
    disabled?: boolean;
    className?: string;
  }
  ```
- **Reusability**: Settings, filters, selections
- **Features**: Custom rendering, keyboard navigation

##### CheckboxGroup
- **Purpose**: Multiple checkboxes with group behavior
- **Variants**: Default, Horizontal, Vertical, Grid
- **Props**:
  ```typescript
  interface CheckboxGroupProps {
    options: CheckboxOption[];
    value: string[];
    onChange: (value: string[]) => void;
    orientation?: 'horizontal' | 'vertical' | 'grid';
    columns?: number;
    className?: string;
  }
  ```
- **Reusability**: Export settings, track visibility, preferences
- **Features**: Select all, group validation

##### RadioGroup
- **Purpose**: Multiple radio buttons with group behavior
- **Variants**: Default, Horizontal, Vertical, Grid
- **Props**:
  ```typescript
  interface RadioGroupProps {
    options: RadioOption[];
    value: string;
    onChange: (value: string) => void;
    orientation?: 'horizontal' | 'vertical' | 'grid';
    columns?: number;
    className?: string;
  }
  ```
- **Reusability**: Export format, quality presets, settings
- **Features**: Group validation, keyboard navigation

##### FormField
- **Purpose**: Complete form field with label/error
- **Variants**: Default, Required, Optional, Disabled
- **Props**:
  ```typescript
  interface FormFieldProps {
    label: string;
    error?: string;
    description?: string;
    required?: boolean;
    optional?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    className?: string;
  }
  ```
- **Reusability**: All forms, settings, dialogs
- **Features**: Accessibility, validation display

##### Card
- **Purpose**: Content container with header/body/footer
- **Variants**: Default, Elevated, Outlined, Filled
- **Props**:
  ```typescript
  interface CardProps {
    title?: string;
    subtitle?: string;
    actions?: React.ReactNode;
    variant?: 'default' | 'elevated' | 'outlined' | 'filled';
    hoverable?: boolean;
    children: React.ReactNode;
    className?: string;
  }
  ```
- **Reusability**: Media items, settings panels, content blocks
- **Features**: Hover effects, action buttons

##### ListItem
- **Purpose**: List item with icon, text, and actions
- **Variants**: Default, Interactive, Selectable, Expandable
- **Props**:
  ```typescript
  interface ListItemProps {
    icon?: React.ReactNode;
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
    onClick?: () => void;
    selected?: boolean;
    disabled?: boolean;
    className?: string;
  }
  ```
- **Reusability**: Media library, settings lists, navigation
- **Features**: Selection states, action buttons

##### BreadcrumbItem
- **Purpose**: Navigation breadcrumb segment
- **Variants**: Default, Link, Current, Separator
- **Props**:
  ```typescript
  interface BreadcrumbItemProps {
    label: string;
    href?: string;
    current?: boolean;
    onClick?: () => void;
    className?: string;
  }
  ```
- **Reusability**: Navigation, project hierarchy
- **Features**: Click navigation, current state

##### TabItem
- **Purpose**: Individual tab element
- **Variants**: Default, Icon, Badge, Disabled
- **Props**:
  ```typescript
  interface TabItemProps {
    label: string;
    icon?: React.ReactNode;
    badge?: number | string;
    disabled?: boolean;
    active?: boolean;
    onClick?: () => void;
    className?: string;
  }
  ```
- **Reusability**: Tab navigation, settings tabs
- **Features**: Badge counts, icon support

##### MenuItem
- **Purpose**: Menu item with icon and text
- **Variants**: Default, Icon, Separator, Disabled
- **Props**:
  ```typescript
  interface MenuItemProps {
    label: string;
    icon?: React.ReactNode;
    shortcut?: string;
    disabled?: boolean;
    separator?: boolean;
    onClick?: () => void;
    className?: string;
  }
  ```
- **Reusability**: Context menus, dropdown menus
- **Features**: Keyboard shortcuts, separators

##### NotificationItem
- **Purpose**: Toast/notification content
- **Variants**: Success, Error, Warning, Info
- **Props**:
  ```typescript
  interface NotificationItemProps {
    title: string;
    message?: string;
    variant?: 'success' | 'error' | 'warning' | 'info';
    action?: React.ReactNode;
    onClose?: () => void;
    autoClose?: boolean;
    className?: string;
  }
  ```
- **Reusability**: Toast notifications, alerts
- **Features**: Auto-dismiss, action buttons

##### MediaCard
- **Purpose**: Media item with thumbnail and info
- **Variants**: Default, Compact, Detailed, Grid
- **Props**:
  ```typescript
  interface MediaCardProps {
    thumbnail: string;
    title: string;
    subtitle?: string;
    duration?: number;
    size?: number;
    selected?: boolean;
    onClick?: () => void;
    onRemove?: () => void;
    className?: string;
  }
  ```
- **Reusability**: Media library, project thumbnails
- **Features**: Selection states, hover effects

##### ControlButton
- **Purpose**: Button with icon and tooltip
- **Variants**: Default, Active, Disabled, Loading
- **Props**:
  ```typescript
  interface ControlButtonProps {
    icon: React.ReactNode;
    tooltip: string;
    active?: boolean;
    disabled?: boolean;
    loading?: boolean;
    onClick?: () => void;
    className?: string;
  }
  ```
- **Reusability**: Toolbars, player controls, timeline controls
- **Features**: Tooltip, active states

##### StatusIndicator
- **Purpose**: Status with icon and text
- **Variants**: Success, Error, Warning, Info, Neutral
- **Props**:
  ```typescript
  interface StatusIndicatorProps {
    status: 'success' | 'error' | 'warning' | 'info' | 'neutral';
    label: string;
    icon?: React.ReactNode;
    className?: string;
  }
  ```
- **Reusability**: Import status, export status, system status
- **Features**: Color coding, icon support

##### MetricCard
- **Purpose**: Display metric with label and value
- **Variants**: Default, Trend, Comparison, Gauge
- **Props**:
  ```typescript
  interface MetricCardProps {
    label: string;
    value: string | number;
    trend?: 'up' | 'down' | 'neutral';
    comparison?: string;
    icon?: React.ReactNode;
    className?: string;
  }
  ```
- **Reusability**: Dashboard, analytics, performance metrics
- **Features**: Trend indicators, comparisons

##### ActionButton
- **Purpose**: Button with loading state
- **Variants**: Primary, Secondary, Danger, Ghost
- **Props**:
  ```typescript
  interface ActionButtonProps {
    children: React.ReactNode;
    loading?: boolean;
    disabled?: boolean;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    onClick?: () => void;
    className?: string;
  }
  ```
- **Reusability**: Form submissions, async actions
- **Features**: Loading states, disabled states

##### FilterChip
- **Purpose**: Removable filter element
- **Variants**: Default, Active, Removable
- **Props**:
  ```typescript
  interface FilterChipProps {
    label: string;
    value: string;
    active?: boolean;
    removable?: boolean;
    onRemove?: () => void;
    onClick?: () => void;
    className?: string;
  }
  ```
- **Reusability**: Media filters, search filters
- **Features**: Active states, removal actions

##### TagInput
- **Purpose**: Input for adding tags
- **Variants**: Default, With Suggestions, With Validation
- **Props**:
  ```typescript
  interface TagInputProps {
    value: string[];
    onChange: (tags: string[]) => void;
    placeholder?: string;
    suggestions?: string[];
    maxTags?: number;
    className?: string;
  }
  ```
- **Reusability**: Project tags, media tags, categories
- **Features**: Auto-complete, validation, limits

#### Organisms (Complex UI Sections)

##### Header
- **Purpose**: Application header with navigation
- **Variants**: Default, Compact, Extended
- **Props**:
  ```typescript
  interface HeaderProps {
    title?: string;
    logo?: React.ReactNode;
    navigation?: NavigationItem[];
    actions?: React.ReactNode;
    user?: UserInfo;
    className?: string;
  }
  ```
- **Reusability**: Main app header, modal headers
- **Features**: Responsive design, user menu

##### Sidebar
- **Purpose**: Collapsible sidebar navigation
- **Variants**: Default, Collapsed, Floating
- **Props**:
  ```typescript
  interface SidebarProps {
    items: SidebarItem[];
    collapsed?: boolean;
    onToggle?: () => void;
    activeItem?: string;
    className?: string;
  }
  ```
- **Reusability**: Main navigation, settings navigation
- **Features**: Collapse/expand, active states

##### Toolbar
- **Purpose**: Action toolbar with grouped controls
- **Variants**: Default, Compact, Floating, Sticky
- **Props**:
  ```typescript
  interface ToolbarProps {
    groups: ToolbarGroup[];
    orientation?: 'horizontal' | 'vertical';
    sticky?: boolean;
    className?: string;
  }
  ```
- **Reusability**: Timeline toolbar, player toolbar
- **Features**: Grouped actions, responsive layout

##### MediaLibrary
- **Purpose**: Complete media management section
- **Variants**: Grid, List, Compact, Detailed
- **Props**:
  ```typescript
  interface MediaLibraryProps {
    items: MediaItem[];
    view?: 'grid' | 'list' | 'compact' | 'detailed';
    onSelect?: (item: MediaItem) => void;
    onImport?: () => void;
    onDelete?: (id: string) => void;
    filters?: FilterOption[];
    search?: string;
    className?: string;
  }
  ```
- **Reusability**: Main media library, project assets
- **Features**: Multiple views, filtering, search

##### Timeline
- **Purpose**: Full timeline editing interface
- **Variants**: Default, Compact, Detailed
- **Props**:
  ```typescript
  interface TimelineProps {
    clips: Clip[];
    tracks: Track[];
    currentTime: number;
    zoom: number;
    onClipSelect?: (clip: Clip) => void;
    onClipMove?: (clip: Clip, position: number) => void;
    onClipTrim?: (clip: Clip, trim: TrimData) => void;
    onTimeChange?: (time: number) => void;
    onZoomChange?: (zoom: number) => void;
    className?: string;
  }
  ```
- **Reusability**: Main timeline, preview timeline
- **Features**: Drag & drop, trimming, zooming

##### VideoPlayer
- **Purpose**: Complete video playback section
- **Variants**: Default, Compact, Fullscreen
- **Props**:
  ```typescript
  interface VideoPlayerProps {
    src?: string;
    currentTime: number;
    duration: number;
    isPlaying: boolean;
    volume: number;
    muted: boolean;
    onPlayPause?: () => void;
    onSeek?: (time: number) => void;
    onVolumeChange?: (volume: number) => void;
    onMute?: () => void;
    className?: string;
  }
  ```
- **Reusability**: Main player, preview player
- **Features**: Controls, fullscreen, keyboard shortcuts

##### RecordingPanel
- **Purpose**: Screen/webcam recording interface
- **Variants**: Default, Compact, Floating
- **Props**:
  ```typescript
  interface RecordingPanelProps {
    mode: 'screen' | 'webcam' | 'both';
    isRecording: boolean;
    duration: number;
    onStart?: () => void;
    onStop?: () => void;
    onPause?: () => void;
    onResume?: () => void;
    settings?: RecordingSettings;
    className?: string;
  }
  ```
- **Reusability**: Recording overlay, settings panel
- **Features**: Multiple modes, timer, controls

##### ExportDialog
- **Purpose**: Complete export configuration
- **Variants**: Default, Advanced, Preset
- **Props**:
  ```typescript
  interface ExportDialogProps {
    open: boolean;
    onClose: () => void;
    onExport: (settings: ExportSettings) => void;
    defaultSettings?: ExportSettings;
    presets?: ExportPreset[];
    className?: string;
  }
  ```
- **Reusability**: Export modal, batch export
- **Features**: Presets, validation, preview

##### SettingsPanel
- **Purpose**: Application settings interface
- **Variants**: Default, Compact, Tabbed
- **Props**:
  ```typescript
  interface SettingsPanelProps {
    sections: SettingsSection[];
    onSave?: (settings: Settings) => void;
    onReset?: () => void;
    className?: string;
  }
  ```
- **Reusability**: App settings, project settings
- **Features**: Sections, validation, reset

##### ProjectManager
- **Purpose**: Project file management
- **Variants**: Default, Compact, Detailed
- **Props**:
  ```typescript
  interface ProjectManagerProps {
    projects: Project[];
    recentProjects: Project[];
    onOpen?: (project: Project) => void;
    onCreate?: () => void;
    onDelete?: (project: Project) => void;
    className?: string;
  }
  ```
- **Reusability**: Project browser, recent projects
- **Features**: Recent projects, project info

##### ClipEditor
- **Purpose**: Advanced clip editing tools
- **Variants**: Default, Compact, Detailed
- **Props**:
  ```typescript
  interface ClipEditorProps {
    clip: Clip;
    onUpdate?: (clip: Clip) => void;
    onDelete?: (clip: Clip) => void;
    className?: string;
  }
  ```
- **Reusability**: Clip properties, advanced editing
- **Features**: Real-time preview, undo/redo

##### TrackControls
- **Purpose**: Track management controls
- **Variants**: Default, Compact, Detailed
- **Props**:
  ```typescript
  interface TrackControlsProps {
    tracks: Track[];
    onTrackUpdate?: (track: Track) => void;
    onTrackAdd?: () => void;
    onTrackDelete?: (track: Track) => void;
    className?: string;
  }
  ```
- **Reusability**: Timeline track controls, track management
- **Features**: Add/remove tracks, visibility toggles

##### PlaybackControls
- **Purpose**: Complete playback control set
- **Variants**: Default, Compact, Floating
- **Props**:
  ```typescript
  interface PlaybackControlsProps {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    muted: boolean;
    playbackRate: number;
    onPlayPause?: () => void;
    onSeek?: (time: number) => void;
    onVolumeChange?: (volume: number) => void;
    onMute?: () => void;
    onRateChange?: (rate: number) => void;
    className?: string;
  }
  ```
- **Reusability**: Player controls, timeline controls
- **Features**: All playback controls, keyboard shortcuts

##### ZoomControls
- **Purpose**: Timeline zoom and navigation
- **Variants**: Default, Compact, Floating
- **Props**:
  ```typescript
  interface ZoomControlsProps {
    zoom: number;
    minZoom: number;
    maxZoom: number;
    onZoomChange?: (zoom: number) => void;
    onZoomIn?: () => void;
    onZoomOut?: () => void;
    onZoomFit?: () => void;
    className?: string;
  }
  ```
- **Reusability**: Timeline zoom, canvas zoom
- **Features**: Zoom presets, fit-to-screen

##### SelectionToolbar
- **Purpose**: Context-sensitive actions
- **Variants**: Default, Floating, Inline
- **Props**:
  ```typescript
  interface SelectionToolbarProps {
    selectedItems: string[];
    actions: ToolbarAction[];
    position?: { x: number; y: number };
    className?: string;
  }
  ```
- **Reusability**: Timeline selection, media selection
- **Features**: Context-sensitive, positioning

##### StatusBar
- **Purpose**: Application status information
- **Variants**: Default, Compact, Detailed
- **Props**:
  ```typescript
  interface StatusBarProps {
    status: StatusInfo;
    progress?: ProgressInfo;
    notifications?: Notification[];
    className?: string;
  }
  ```
- **Reusability**: Main status bar, modal status
- **Features**: Progress indicators, notifications

##### CommandPalette
- **Purpose**: Quick command interface
- **Variants**: Default, Compact, Fullscreen
- **Props**:
  ```typescript
  interface CommandPaletteProps {
    open: boolean;
    onClose: () => void;
    commands: Command[];
    onExecute?: (command: Command) => void;
    className?: string;
  }
  ```
- **Reusability**: Global commands, quick actions
- **Features**: Search, keyboard shortcuts, categories

##### HelpPanel
- **Purpose**: Contextual help and shortcuts
- **Variants**: Default, Compact, Floating
- **Props**:
  ```typescript
  interface HelpPanelProps {
    context?: string;
    shortcuts?: Shortcut[];
    onClose?: () => void;
    className?: string;
  }
  ```
- **Reusability**: Contextual help, keyboard shortcuts
- **Features**: Context-sensitive, searchable

##### ErrorPanel
- **Purpose**: Error display and recovery
- **Variants**: Default, Compact, Detailed
- **Props**:
  ```typescript
  interface ErrorPanelProps {
    error: ErrorInfo;
    onRetry?: () => void;
    onDismiss?: () => void;
    onReport?: () => void;
    className?: string;
  }
  ```
- **Reusability**: Error handling, crash recovery
- **Features**: Retry actions, error reporting

##### LoadingPanel
- **Purpose**: Application loading states
- **Variants**: Default, Compact, Fullscreen
- **Props**:
  ```typescript
  interface LoadingPanelProps {
    message?: string;
    progress?: number;
    cancellable?: boolean;
    onCancel?: () => void;
    className?: string;
  }
  ```
- **Reusability**: Loading states, progress indicators
- **Features**: Progress display, cancellation

### Component Reusability Matrix

| Component Category | Component | Uses Count | Used In | Reusability Score |
|-------------------|-----------|-----------|---------|-------------------|
| **Atoms** | Button | 150+ | Toolbars, Dialogs, Forms, Menus | ⭐⭐⭐⭐⭐ |
| | Input | 50+ | Forms, Settings, Search | ⭐⭐⭐⭐⭐ |
| | Slider | 25+ | Zoom, Volume, Scrubbing, Settings | ⭐⭐⭐⭐⭐ |
| | Checkbox | 30+ | Settings, Filters, Preferences | ⭐⭐⭐⭐⭐ |
| | Radio | 20+ | Export Settings, Quality Presets | ⭐⭐⭐⭐⭐ |
| | Toggle | 15+ | Feature Flags, Auto-save | ⭐⭐⭐⭐⭐ |
| | Select | 25+ | Camera Selection, Format Selection | ⭐⭐⭐⭐⭐ |
| | Textarea | 10+ | Project Notes, Comments | ⭐⭐⭐⭐ |
| | Badge | 40+ | Status Indicators, Labels | ⭐⭐⭐⭐⭐ |
| | Spinner | 35+ | Loading States, Progress | ⭐⭐⭐⭐⭐ |
| | Tooltip | 100+ | Help Text, Shortcuts | ⭐⭐⭐⭐⭐ |
| | Icon | 200+ | All UI Elements | ⭐⭐⭐⭐⭐ |
| **Molecules** | ButtonGroup | 20+ | Toolbars, Action Groups | ⭐⭐⭐⭐ |
| | InputGroup | 30+ | Forms, Settings | ⭐⭐⭐⭐ |
| | SearchBox | 15+ | Media Library, Global Search | ⭐⭐⭐⭐ |
| | Dropdown | 20+ | Settings, Filters | ⭐⭐⭐⭐ |
| | FormField | 40+ | All Forms | ⭐⭐⭐⭐⭐ |
| | Card | 25+ | Media Items, Settings Panels | ⭐⭐⭐⭐ |
| | ListItem | 30+ | Lists, Navigation | ⭐⭐⭐⭐ |
| | MediaCard | 15+ | Media Library | ⭐⭐⭐ |
| | ControlButton | 50+ | Toolbars, Controls | ⭐⭐⭐⭐ |
| | StatusIndicator | 20+ | Status Display | ⭐⭐⭐⭐ |
| **Organisms** | Header | 5+ | Main App, Modals | ⭐⭐⭐ |
| | Sidebar | 3+ | Main Navigation | ⭐⭐⭐ |
| | Toolbar | 8+ | Timeline, Player, Export | ⭐⭐⭐ |
| | MediaLibrary | 2+ | Main Library | ⭐⭐ |
| | Timeline | 1+ | Main Timeline | ⭐ |
| | VideoPlayer | 2+ | Main Player, Preview | ⭐⭐ |
| | RecordingPanel | 1+ | Recording Interface | ⭐ |
| | ExportDialog | 1+ | Export Modal | ⭐ |
| | SettingsPanel | 2+ | App Settings | ⭐⭐ |
| | PlaybackControls | 3+ | Player Controls | ⭐⭐⭐ |

### Component Development Priority

#### Priority 1: Foundation Atoms (Phase 0-1)
- Button, Input, Slider, Checkbox, Radio, Toggle
- Select, Textarea, Badge, Spinner, Tooltip, Icon
- **Rationale**: Used in 100+ locations, foundation for all UI

#### Priority 2: Layout & Feedback (Phase 1-2)
- Panel, Container, ScrollArea, SplitPane
- Toast, Modal, Dialog, ProgressBar, LoadingOverlay
- **Rationale**: Structural components needed for layout

#### Priority 3: Media & Timeline (Phase 2-3)
- MediaCard, MediaLibrary, TimelineCanvas, Clip, Track
- VideoPlayer, PlayerControls, SeekBar, VolumeSlider
- **Rationale**: Core video editing functionality

#### Priority 4: Recording & Export (Phase 4-5)
- RecordingPanel, ScreenSelector, WebcamPreview
- ExportDialog, ExportProgress, ExportSettings
- **Rationale**: Advanced features for complete workflow

#### Priority 5: Polish & Enhancement (Phase 6)
- ErrorBoundary, CommandPalette, HelpPanel
- Advanced molecules and organisms
- **Rationale**: User experience enhancements

### Component Design Principles

#### 1. Atomic Design Methodology
- **Atoms**: Single-purpose, highly reusable (Button, Input, Icon)
- **Molecules**: Simple combinations (ButtonGroup, FormField, MediaCard)
- **Organisms**: Complex sections (Timeline, MediaLibrary, VideoPlayer)
- **Templates**: Page layouts (MainLayout, RecordingLayout)
- **Pages**: Complete views (HomePage, RecordingPage)

#### 2. Single Responsibility Principle
Each component has one clear purpose:
- `Button` → Interactive button element
- `MediaCard` → Display single media file with actions
- `TimelineCanvas` → Render timeline with clips and tracks
- `ExportDialog` → Configure export settings

#### 3. Composition over Configuration
Prefer composing components over complex prop APIs:
```typescript
// ❌ Bad: Complex configuration
<Button 
  icon="play" 
  text="Play" 
  variant="primary" 
  size="large" 
  loading={false}
  disabled={false}
/>

// ✅ Good: Composition
<Button variant="primary" size="large">
  <PlayIcon />
  Play
</Button>
```

#### 4. Controlled vs Uncontrolled
- **Controlled**: Parent manages state via props + callbacks
- **Uncontrolled**: Component manages internal state
- **Rule**: Use controlled for shared state, uncontrolled for local state

#### 5. Accessibility First
- All interactive components support keyboard navigation
- ARIA labels on all icon-only buttons
- Focus management in modals and dialogs
- Screen reader compatibility
- High contrast mode support

#### 6. Performance Optimization
- Use `React.memo` for heavy components (MediaCard, Clip)
- Lazy load feature components (Export, Recording)
- Virtual scrolling for long lists (100+ items)
- Canvas rendering for timeline (Konva)
- Debounce expensive operations (search, resize)

#### 7. Theme Consistency
- All components use Tailwind design tokens
- Consistent spacing system (4px base unit)
- Dark theme optimized for video editing
- Consistent hover/focus states
- Color system with semantic meaning

#### 8. Error Boundaries
- Wrap major feature areas with error boundaries
- Graceful degradation for component failures
- User-friendly error messages
- Recovery actions where possible

#### 9. Testing Strategy
- Unit tests for all atoms and molecules
- Integration tests for organisms
- Visual regression tests for UI components
- Accessibility tests for interactive components

#### 10. Documentation Standards
- Storybook stories for all components
- Props documentation with examples
- Usage guidelines and best practices
- Accessibility notes and keyboard shortcuts

#### Checkbox
- **Purpose**: Binary selection
- **States**: Unchecked, Checked, Indeterminate, Disabled
- **Props**: `checked`, `indeterminate`, `onChange`, `disabled`
- **Reusability**: Track visibility toggles, export settings, preferences

#### Radio
- **Purpose**: Single selection from group
- **States**: Unselected, Selected, Disabled
- **Props**: `value`, `selected`, `onChange`, `disabled`
- **Reusability**: Export format selection, quality presets

#### Toggle Switch
- **Purpose**: On/off toggle
- **States**: Off, On, Disabled
- **Props**: `checked`, `onChange`, `disabled`, `label`
- **Reusability**: Auto-save, advanced settings, feature flags

#### Select/Dropdown
- **Purpose**: Single/multi selection from list
- **Variants**: Dropdown, Multi-select, Searchable
- **States**: Closed, Open, Focus, Disabled
- **Props**: `options`, `value`, `onChange`, `multiple`, `searchable`
- **Reusability**: Camera selection, quality presets, export formats

#### Textarea
- **Purpose**: Multi-line text input
- **States**: Default, Focus, Error, Disabled
- **Props**: `rows`, `placeholder`, `value`, `onChange`, `error`
- **Reusability**: Project notes, clip descriptions

#### Badge
- **Purpose**: Status indicator or label
- **Variants**: Info, Success, Warning, Error
- **Props**: `variant`, `children`, `dot` (for dot-only)
- **Reusability**: Import status, export status, track labels

#### Spinner/Loading
- **Purpose**: Loading indicator
- **Variants**: Circle, Bars, Dots
- **Props**: `size`, `color`, `speed`
- **Reusability**: Import progress, export progress, async operations

#### Tooltip
- **Purpose**: Contextual help text
- **Position**: Top, Bottom, Left, Right
- **Props**: `content`, `position`, `delay`, `trigger`
- **Reusability**: Icon buttons, keyboard shortcuts, feature explanations

---

### 2. Layout Components

Structural components that organize and arrange content.

#### Panel
- **Purpose**: Container with header, body, optional footer
- **Variants**: Default, Collapsible, Resizable
- **Props**: `title`, `icon`, `collapsible`, `collapsed`, `onToggle`, `defaultWidth`
- **Reusability**: Media library, properties panel, export dialog

#### Container
- **Purpose**: General content wrapper with padding/margins
- **Variants**: Section, Card, Well
- **Props**: `variant`, `padding`, `margin`, `background`
- **Reusability**: All major sections

#### SplitPane
- **Purpose**: Resizable split views (horizontal/vertical)
- **Props**: `direction`, `sizes`, `onResize`, `minSizes`
- **Reusability**: Media library + timeline, player + timeline

#### ScrollArea
- **Purpose**: Scrollable container with custom scrollbar
- **Props**: `maxHeight`, `scrollBehavior`, `hideScrollbar`
- **Reusability**: Media library list, timeline tracks, logs

#### GridLayout
- **Purpose**: Responsive grid container
- **Props**: `columns`, `gap`, `items` (children)
- **Reusability**: Media library grid, export preset grid

#### FlexLayout
- **Purpose**: Flexible box layout
- **Props**: `direction`, `justify`, `align`, `wrap`, `gap`
- **Reusability**: Toolbars, player controls

#### Window
- **Purpose**: Draggable/resizable modal window
- **Props**: `title`, `resizable`, `draggable`, `minSize`, `maxSize`
- **Reusability**: Export dialog, recording panel, settings modal

---

### 3. Feedback Components

Components that provide user feedback and status information.

#### Toast
- **Purpose**: Temporary success/error notifications
- **Variants**: Success, Error, Warning, Info
- **Props**: `message`, `variant`, `duration`, `action`, `onClose`
- **Reusability**: Import completion, export success, error messages

#### Modal
- **Purpose**: Dialog overlay for important actions
- **Variants**: Default, Confirmation, Alert
- **Props**: `open`, `onClose`, `title`, `confirmText`, `cancelText`
- **Reusability**: Delete confirmation, unsaved changes warning

#### Dialog
- **Purpose**: Modal with content (forms, settings)
- **Props**: `open`, `onClose`, `title`, `fullscreen`, `width`
- **Reusability**: Export dialog, settings modal

#### Alert
- **Purpose**: Inline error/warning message
- **Variants**: Error, Warning, Info, Success
- **Props**: `variant`, `message`, `dismissible`, `icon`
- **Reusability**: Form validation, import errors

#### ProgressBar
- **Purpose**: Progress indicator for operations
- **Variants**: Linear, Circular, Determinate, Indeterminate
- **Props**: `value`, `max`, `showPercentage`, `label`, `buffer`
- **Reusability**: Import progress, export progress, render progress

#### LoadingOverlay
- **Purpose**: Full-page or section loading state
- **Props**: `message`, `spinner`, `overlay`
- **Reusability**: Initial app load, export in progress

#### ErrorBoundary
- **Purpose**: Catch and display React errors gracefully
- **Props**: `fallback`, `onError`
- **Reusability**: Wrapper for all major feature areas

---

### 4. Navigation Components

Components for navigating between views and sections.

#### Tabs
- **Purpose**: Tabbed interface
- **Variants**: Horizontal, Vertical
- **Props**: `tabs`, `activeTab`, `onChange`, `indicator`
- **Reusability**: Settings tabs, media library tabs

#### Breadcrumb
- **Purpose**: Hierarchical navigation
- **Props**: `items`, `separator`, `onClick`
- **Reusability**: Project navigation (future)

#### Menu
- **Purpose**: Context menu or dropdown menu
- **Variants**: Context, Dropdown, Cascading
- **Props**: `items`, `position`, `onSelect`
- **Reusability**: Clip context menu, track options

---

### 5. Media-Specific Components

Specialized components for handling media content.

#### Thumbnail
- **Purpose**: Display video thumbnail image
- **Props**: `src`, `duration`, `width`, `height`, `onClick`
- **Reusability**: Media library items, timeline clip representation

#### VideoPreview
- **Purpose**: Live video preview with playback
- **Props**: `src`, `currentTime`, `duration`, `playing`, `muted`
- **Reusability**: Main player, media item preview

#### AudioWaveform
- **Purpose**: Visual audio waveform representation
- **Props**: `audioData`, `duration`, `currentTime`
- **Reusability**: Audio track visualization (future)

#### TimelineRuler
- **Purpose**: Time scale ruler for timeline
- **Props**: `duration`, `zoom`, `unit`, `markers`
- **Reusability**: Timeline header, player scrub bar

---

### 6. Timeline Components

Components specific to the timeline editing interface.

#### TimelineCanvas
- **Purpose**: Konva-based timeline rendering surface
- **Props**: `width`, `height`, `zoom`, `onZoom`, `onPan`
- **Reusability**: Main timeline view

#### Clip
- **Purpose**: Visual representation of video clip on timeline
- **Props**: `clip`, `isSelected`, `trimHandles`, `onDragStart`, `onResizeStart`
- **Reusability**: All clips on timeline

#### Track
- **Purpose**: Timeline track container for clips
- **Props**: `track`, `clips`, `height`, `locked`, `visible`, `onToggle`
- **Reusability**: Video tracks, audio tracks, overlay tracks

#### Playhead
- **Purpose**: Red vertical line indicating current time
- **Props**: `currentTime`, `height`, `zoom`, `draggable`
- **Reusability**: Timeline playhead, player scrub indicator

#### ZoomSlider
- **Purpose**: Timeline zoom control
- **Props**: `zoom`, `minZoom`, `maxZoom`, `onZoom`
- **Reusability**: Timeline toolbar

#### SnapIndicator
- **Purpose**: Visual guide showing snap-to-grid
- **Props**: `enabled`, `gridSize`
- **Reusability**: Timeline snapping visual feedback

---

### 7. Player Components

Components for video playback and control.

#### VideoPlayer
- **Purpose**: HTML5 video element with player controls
- **Props**: `src`, `currentTime`, `playing`, `volume`, `muted`
- **Reusability**: Main player view

#### PlayerControls
- **Purpose**: Playback control buttons and sliders
- **Props**: `playing`, `onPlayPause`, `volume`, `onVolumeChange`, `duration`
- **Reusability**: Player control bar

#### SeekBar
- **Purpose**: Timeline scrubbing control
- **Props**: `value`, `max`, `onChange`, `buffer`
- **Reusability**: Player seek bar, timeline scrub

#### VolumeSlider
- **Purpose**: Volume control slider
- **Props**: `value`, `max`, `onChange`, `onMute`
- **Reusability**: Player controls, recording controls

#### PlaybackRate
- **Purpose**: Playback speed control (0.5x, 1x, 2x)
- **Props**: `rate`, `onChange`
- **Reusability**: Player playback rate

---

### 8. Library Components

Components for managing and displaying media library.

#### MediaLibrary
- **Purpose**: Container for media items
- **Props**: `items`, `onSelect`, `onImport`, `onDelete`
- **Reusability**: Media library panel

#### MediaItem
- **Purpose**: Individual media file card
- **Props**: `item`, `thumbnail`, `duration`, `onClick`, `onDelete`
- **Reusability**: Grid items in media library

#### MediaGrid
- **Purpose**: Responsive grid for media items
- **Props**: `items`, `columns`, `gap`, `renderItem`
- **Reusability**: Media library grid layout

#### DropZone
- **Purpose**: Drag-and-drop file import area
- **Props**: `accept`, `onDrop`, `overlay`
- **Reusability**: Media library, import area

#### EmptyState
- **Purpose**: Empty state placeholder
- **Props**: `message`, `action`, `icon`
- **Reusability**: Empty media library, empty timeline

---

### 9. Recording Components

Components for screen and webcam recording.

#### RecordingPanel
- **Purpose**: Recording interface container
- **Props**: `mode`, `onStart`, `onStop`, `onCancel`
- **Reusability**: Recording overlay

#### ScreenSelector
- **Purpose**: Screen/window selection interface
- **Props**: `screens`, `windows`, `onSelect`, `selected`
- **Reusability**: Recording source selection

#### WebcamPreview
- **Purpose**: Live webcam feed preview
- **Props**: `stream`, `muted`, `mirrored`
- **Reusability**: Webcam recording preview

#### RecordingControls
- **Purpose**: Recording start/stop/pause controls
- **Props**: `recording`, `paused`, `onStart`, `onStop`, `onPause`
- **Reusability**: Recording control panel

#### TimerDisplay
- **Purpose**: Recording duration timer
- **Props**: `duration`, `format`
- **Reusability**: Recording status display

---

### 10. Export Components

Components for video export functionality.

#### ExportDialog
- **Purpose**: Export settings and file picker
- **Props**: `open`, `onClose`, `onExport`, `defaultSettings`
- **Reusability**: Export modal

#### ExportProgress
- **Purpose**: Export progress indicator
- **Props**: `percentage`, `stage`, `estimatedTime`, `onCancel`
- **Reusability**: Export progress overlay

#### ExportSettings
- **Purpose**: Export configuration form
- **Props**: `settings`, `onChange`, `presets`
- **Reusability**: Export settings panel

---

### 11. Shared Components

Utility components used across the application.

#### Icon
- **Purpose**: Unified icon component (Lucide)
- **Props**: `name`, `size`, `color`, `stroke`
- **Reusability**: All icon usage (100+ instances)

#### KeyboardShortcut
- **Purpose**: Display keyboard shortcuts
- **Props**: `keys`, `description`
- **Reusability**: Tooltips, help menu

#### DragHandle
- **Purpose**: Visual drag handle indicator
- **Props**: `direction`, `active`
- **Reusability**: Resizable panels, timeline clips

---

### Component Design Principles

#### 1. Atomic Design
- **Atoms**: Button, Input, Icon
- **Molecules**: Button+Icon, Input+Label, PlayerControls
- **Organisms**: MediaLibrary, Timeline, VideoPlayer
- **Templates**: App Layout, Recording Panel
- **Pages**: Main App

#### 2. Single Responsibility
Each component has one clear purpose:
- `Button` → Interactive button element
- `MediaItem` → Display single media file
- `Clip` → Display single timeline clip

#### 3. Composition over Configuration
Prefer composing components over complex prop APIs:
- Bad: `<Button icon="play" text="Play" variant="primary" size="large" />`
- Good: `<Button variant="primary" size="large"><PlayIcon /> Play</Button>`

#### 4. Controlled vs Uncontrolled
- Use controlled components (props + callbacks) for stateful features
- Use uncontrolled for simple inputs where parent doesn't need state

#### 5. Accessibility First
- All interactive components support keyboard navigation
- ARIA labels on all icon-only buttons
- Focus management in modals
- Screen reader support (future enhancement)

#### 6. Performance Optimization
- Use `React.memo` for heavy components (MediaItem, Clip)
- Lazy load feature components (Export, Recording)
- Virtual scrolling for long lists (100+ items)
- Canvas rendering for timeline (Konva)

#### 7. Theme Consistency
- All components use Tailwind design tokens
- Consistent spacing system (4px base unit)
- Dark theme optimized for video editing
- Consistent hover/focus states

---

### Component Reusability Matrix

| Component | Uses Count | Used In |
|-----------|-----------|---------|
| Button | 50+ | Toolbars, Dialogs, Controls |
| Input | 15+ | Forms, Settings, Search |
| Slider | 10+ | Zoom, Volume, Scrubbing |
| Modal | 8+ | Export, Settings, Confirmations |
| Toast | 20+ | All async operations |
| Panel | 8+ | All major sections |
| DropZone | 3+ | Media library, Import |
| VideoPlayer | 1 | Main player view |
| TimelineCanvas | 1 | Timeline view |
| Clip | Dynamic | Timeline (1 per clip) |
| Track | Dynamic | Timeline (3-5 per session) |

---

### Component Development Priority

#### Priority 1: Foundation (Phase 0-1)
- Button, Input, Slider, Checkbox, Radio, Toggle
- Panel, Container, ScrollArea
- Toast, Modal, Dialog, ProgressBar
- Icon, Tooltip
- MediaItem, DropZone, EmptyState

#### Priority 2: Core Features (Phase 2-3)
- TimelineCanvas, Clip, Track, Playhead, TimeRuler
- VideoPlayer, PlayerControls, SeekBar, VolumeSlider
- MediaLibrary, MediaGrid
- TimelineCanvas, ZoomSlider

#### Priority 3: Recording (Phase 5)
- RecordingPanel, ScreenSelector, WebcamPreview
- RecordingControls, TimerDisplay

#### Priority 4: Export (Phase 4)
- ExportDialog, ExportProgress, ExportSettings

#### Priority 5: Polish (Phase 6)
- ErrorBoundary, LoadingOverlay, Enhanced Tooltips

---

## Functional Requirements

### FR-1: Application Lifecycle

#### FR-1.1: Application Launch
- **Requirement**: App must launch and display main interface within 5 seconds
- **Implementation**: 
  - Tauri app initialization with splash screen
  - Lazy-load non-critical components
  - Cache previous project state if available
- **Acceptance Criteria**:
  - Window opens < 2 seconds on modern hardware
  - Main UI rendered < 5 seconds
  - No blank screens or loading spinners beyond splash

#### FR-1.2: Window Management
- **Requirement**: Native window controls with custom titlebar
- **Implementation**:
  - Custom React titlebar with minimize/maximize/close
  - Window state persistence (size, position)
  - Multi-monitor support
- **Acceptance Criteria**:
  - Window remembers last size/position
  - Drag titlebar to move window
  - Double-click titlebar to maximize/restore

#### FR-1.3: Project State Management
- **Requirement**: Auto-save project state every 30 seconds
- **Implementation**:
  - Save timeline state to local JSON file
  - Track unsaved changes indicator
  - Prompt user on quit if unsaved changes exist
- **Acceptance Criteria**:
  - No data loss if app crashes
  - User can reopen last project
  - Unsaved indicator visible in UI

---

### FR-2: Media Import

#### FR-2.1: Drag & Drop Import
- **Requirement**: Users can drag video files from file explorer into media library
- **Implementation**:
  - Drop zone covering entire media library panel
  - Visual feedback on drag-over (highlight border)
  - Support multiple files in single drag operation
  - Validate file types before import
- **Acceptance Criteria**:
  - Drop MP4, MOV, WebM files successfully
  - Invalid files show error message
  - Multiple files import simultaneously
  - Progress indicator for large files

#### FR-2.2: File Picker Import
- **Requirement**: File picker dialog for selecting videos from disk
- **Implementation**:
  - Native OS file dialog via Tauri
  - Filter to show only supported formats
  - Multi-select support
- **Acceptance Criteria**:
  - Dialog opens on button click
  - Only video files visible (filtered)
  - Can select 1 or multiple files
  - Files appear in media library after selection

#### FR-2.3: Media Library Display
- **Requirement**: Imported clips displayed with thumbnails and metadata
- **Implementation**:
  - Extract first frame as thumbnail via FFmpeg
  - Display filename, duration, resolution, file size
  - Grid view with hover effects
  - Right-click context menu (remove, rename, properties)
- **Acceptance Criteria**:
  - Thumbnail generated within 2 seconds
  - Metadata accurate (duration ±0.1s)
  - Smooth hover animations
  - Context menu actions work correctly

#### FR-2.4: Media Validation
- **Requirement**: Verify imported media is valid and supported
- **Implementation**:
  - FFprobe to extract codec information
  - Check for corrupt files
  - Warn on unsupported codecs
  - Suggest re-encoding if necessary
- **Acceptance Criteria**:
  - Corrupt files rejected with clear error
  - Unsupported formats show specific message
  - Valid files import without issues

---

### FR-3: Timeline Editor

#### FR-3.1: Timeline UI Structure
- **Requirement**: Visual timeline with time ruler, tracks, and clips
- **Implementation**:
  - Canvas-based rendering via react-konva
  - Time ruler showing seconds/minutes
  - Minimum 2 tracks (main video + overlay)
  - Snap-to-grid with 0.1s precision
- **Acceptance Criteria**:
  - Timeline renders smoothly (60fps)
  - Time ruler accurate to frame
  - Tracks clearly separated
  - Grid snapping works at all zoom levels

#### FR-3.2: Clip Placement
- **Requirement**: Drag clips from media library onto timeline
- **Implementation**:
  - Drag start from media library item
  - Ghost preview while dragging
  - Drop onto specific track at specific time
  - Prevent overlapping clips on same track
- **Acceptance Criteria**:
  - Drag operation smooth (no lag)
  - Drop position accurate to snap grid
  - Clips don't overlap (push adjacent clips)
  - Visual feedback during drag

#### FR-3.3: Clip Arrangement
- **Requirement**: Reorder clips on timeline by dragging
- **Implementation**:
  - Click and drag existing timeline clips
  - Horizontal movement only (within same track)
  - Vertical movement to change tracks
  - Collision detection with other clips
- **Acceptance Criteria**:
  - Clips move smoothly during drag
  - Can move between tracks
  - Other clips reposition automatically
  - Undo/redo supports rearrangement

#### FR-3.4: Clip Trimming
- **Requirement**: Adjust clip start/end points (in/out points)
- **Implementation**:
  - Drag clip left edge to adjust start time
  - Drag clip right edge to adjust end time
  - Cursor changes to resize icon on hover
  - Real-time duration update
  - Cannot trim beyond clip's actual duration
- **Acceptance Criteria**:
  - Trim handles responsive (no lag)
  - Frame-accurate trimming
  - Duration label updates in real-time
  - Min clip length 0.1s (prevent invisible clips)

#### FR-3.5: Clip Splitting
- **Requirement**: Split clip at playhead position
- **Implementation**:
  - Keyboard shortcut (Cmd/Ctrl + K)
  - Right-click menu option
  - Create two separate clips at playhead
  - Preserve all properties (effects, etc.)
- **Acceptance Criteria**:
  - Split happens instantly (<100ms)
  - Both clips playable independently
  - No frame loss at split point
  - Undo restores original clip

#### FR-3.6: Clip Deletion
- **Requirement**: Remove clips from timeline
- **Implementation**:
  - Delete/Backspace key for selected clips
  - Right-click menu delete option
  - Multi-select support (Cmd/Ctrl + click)
  - Gap closure (clips shift left)
- **Acceptance Criteria**:
  - Clips removed immediately
  - Timeline updates without artifacts
  - Undo/redo supports deletion
  - Multi-delete works correctly

#### FR-3.7: Playhead Control
- **Requirement**: Visual indicator of current time position
- **Implementation**:
  - Red vertical line spanning all tracks
  - Draggable to any position (scrubbing)
  - Updates during playback
  - Snaps to frame boundaries
- **Acceptance Criteria**:
  - Playhead visible at all zoom levels
  - Scrubbing smooth (no stuttering)
  - Accurate position display (timecode)
  - Snapping to frames works correctly

#### FR-3.8: Timeline Zoom
- **Requirement**: Zoom in/out for precision editing
- **Implementation**:
  - Zoom slider (1x to 100x)
  - Keyboard shortcuts (Cmd/Ctrl + Plus/Minus)
  - Scroll wheel zoom (with Cmd/Ctrl modifier)
  - Zoom centers on playhead position
- **Acceptance Criteria**:
  - Smooth zoom transitions
  - Frame-level precision at max zoom
  - No UI artifacts during zoom
  - Zoom level persists across sessions

#### FR-3.9: Timeline Navigation
- **Requirement**: Pan horizontally to view different sections
- **Implementation**:
  - Click and drag empty timeline area
  - Scrollbar for long timelines
  - Auto-scroll during playback
  - Jump to start/end buttons
- **Acceptance Criteria**:
  - Pan smooth (60fps minimum)
  - Scrollbar position accurate
  - Playhead remains visible during playback
  - Navigation shortcuts work (Home/End keys)

---

### FR-4: Video Player & Preview

#### FR-4.1: Video Preview Window
- **Requirement**: Real-time preview of current frame at playhead
- **Implementation**:
  - HTML5 `<video>` element
  - Synchronized with playhead position
  - Render composite of all visible tracks
  - Maintain aspect ratio (letterbox/pillarbox)
- **Acceptance Criteria**:
  - Preview updates within 50ms of playhead move
  - No black frames or flickers
  - Correct layering (overlays on top)
  - Aspect ratio preserved

#### FR-4.2: Playback Controls
- **Requirement**: Play/pause, stop, seek controls
- **Implementation**:
  - Play/Pause button (spacebar toggle)
  - Stop button (return to last start position)
  - Skip forward/backward (1s, 5s, 10s)
  - Loop region option
- **Acceptance Criteria**:
  - Playback starts within 200ms
  - Audio/video synchronized (±50ms)
  - Smooth frame transitions
  - Keyboard shortcuts responsive

#### FR-4.3: Scrubbing
- **Requirement**: Drag playhead to any position for instant preview
- **Implementation**:
  - Mouse drag on playhead handle
  - Click anywhere on time ruler to jump
  - Seek preview frame immediately
  - Audio muted during scrub
- **Acceptance Criteria**:
  - Scrubbing feels instant (<100ms latency)
  - Frames update smoothly
  - No memory leaks during scrubbing
  - Position accurate to current zoom level

#### FR-4.4: Audio Playback
- **Requirement**: Synchronized audio during preview and playback
- **Implementation**:
  - Extract audio streams via FFmpeg
  - Mix multiple audio tracks
  - Web Audio API for playback
  - Volume control slider
- **Acceptance Criteria**:
  - Audio synced with video (±50ms)
  - No pops, clicks, or artifacts
  - Volume changes smooth
  - Mute button works instantly

#### FR-4.5: Multi-Track Rendering
- **Requirement**: Preview composite of all visible clips at playhead
- **Implementation**:
  - Layer clips by track order (track 0 bottom)
  - Alpha blending for overlays
  - Clip visibility toggle per track
  - Real-time composition
- **Acceptance Criteria**:
  - Overlays rendered correctly
  - No performance degradation with 3+ tracks
  - Visibility toggles instant
  - Transparency supported

---

### FR-5: Screen & Webcam Recording

#### FR-5.1: Screen Recording
- **Requirement**: Capture full screen, window, or region
- **Implementation**:
  - Browser: `navigator.mediaDevices.getDisplayMedia()` API
  - Native browser screen picker (cross-platform)
  - No system permissions required (browser handles prompts)
  - MediaRecorder API for WebM capture
  - Backend FFmpeg re-encoding to MP4 for consistency
  - Save to recordings directory, import to media library
- **Acceptance Criteria**:
  - 30fps minimum capture rate
  - No dropped frames on modern hardware
  - Recording indicator visible in browser
  - Output file valid MP4 and importable
  - Works on macOS, Windows, and Linux

#### FR-5.2: Webcam Recording
- **Requirement**: Capture from system camera
- **Implementation**:
  - `navigator.mediaDevices.getUserMedia()` API in frontend
  - Browser's `enumerateDevices()` for device selection
  - Camera selection dropdown
  - Resolution: 1280x720 default
  - Combined with screen capture via MediaRecorder
- **Acceptance Criteria**:
  - Camera list populates correctly
  - Browser permission prompt handles access
  - Recording starts within 1 second
  - Output file valid MP4

#### FR-5.3: Simultaneous Screen + Webcam
- **Requirement**: Picture-in-picture recording mode
- **Implementation**:
  - Two separate recording streams
  - Webcam overlay in corner of screen recording
  - Position and size adjustable
  - Combined output or separate files (user choice)
- **Acceptance Criteria**:
  - Both streams synchronized (±100ms)
  - Webcam overlay doesn't block important UI
  - User can reposition overlay
  - Output file includes both streams

#### FR-5.4: Audio Capture
- **Requirement**: Record microphone and/or system audio
- **Implementation**:
  - `navigator.mediaDevices.getUserMedia()` for microphone
  - Browser permission prompts handle access
  - Audio source selection via `enumerateDevices()`
  - Combined with display stream in MediaRecorder
  - System audio capture via browser (when user selects tab/window audio)
- **Acceptance Criteria**:
  - Audio sources detected correctly
  - No audio desync with video
  - Volume meter reflects input level
  - Multiple audio tracks supported

#### FR-5.5: Recording Controls
- **Requirement**: Start, pause, resume, stop recording
- **Implementation**:
  - Record button (red circle)
  - Pause button during recording
  - Stop button (saves file)
  - Discard button (cancels without saving)
  - Timer showing elapsed time
- **Acceptance Criteria**:
  - All buttons responsive (<200ms)
  - Pause/resume works without artifacts
  - Timer accurate to 0.1s
  - Discard properly cleans up temp files

---

### FR-6: Video Export

#### FR-6.1: Export Dialog
- **Requirement**: Configure export settings before rendering
- **Implementation**:
  - Modal dialog with settings form
  - Resolution dropdown (720p, 1080p, 4K, source)
  - Format selection (MP4, MOV, WebM)
  - Quality presets (low, medium, high)
  - Custom codec options (advanced)
  - Output path selection
- **Acceptance Criteria**:
  - Default settings sensible (1080p, MP4, high quality)
  - All options clearly labeled
  - File picker for output path
  - Settings validation before export

#### FR-6.2: FFmpeg Encoding
- **Requirement**: Render timeline to final video file
- **Implementation**:
  - Generate FFmpeg command from timeline state
  - Handle clip trimming, arrangement, transitions
  - Mix multiple audio tracks
  - Apply effects and overlays
  - H.264 codec for broad compatibility
- **Acceptance Criteria**:
  - Export completes without errors
  - Output file plays in standard players
  - Duration matches timeline ±0.1s
  - No quality degradation (same res/bitrate)

#### FR-6.3: Export Progress Indicator
- **Requirement**: Real-time feedback during export
- **Implementation**:
  - Progress bar (0-100%)
  - Estimated time remaining
  - Current frame / total frames
  - Cancel button
  - Success/error notification
- **Acceptance Criteria**:
  - Progress bar updates smoothly
  - Time estimate accurate within 20%
  - Cancel stops export immediately
  - Notification on completion

#### FR-6.4: Export Performance
- **Requirement**: Efficient encoding without blocking UI
- **Implementation**:
  - FFmpeg process runs in separate thread
  - Stream progress events to frontend
  - Hardware acceleration if available (VideoToolbox, NVENC)
  - Prevent system sleep during export
- **Acceptance Criteria**:
  - UI remains responsive during export
  - Export speed ≥1x realtime on modern hardware
  - CPU usage reasonable (<80% sustained)
  - System doesn't sleep mid-export

#### FR-6.5: Output Validation
- **Requirement**: Verify exported file is valid
- **Implementation**:
  - FFprobe to check output file
  - Validate duration, resolution, codec
  - Playback test (first 5 seconds)
  - Error reporting if validation fails
- **Acceptance Criteria**:
  - Validation completes within 5 seconds
  - Errors clearly reported to user
  - User prompted to retry on failure
  - Valid files confirmed with success message

---

### FR-7: User Interface

#### FR-7.1: Layout Structure
- **Requirement**: Organized workspace with distinct areas
- **Implementation**:
  - Top: Toolbar (import, record, export buttons)
  - Left: Media library panel
  - Center-Top: Video player
  - Center-Bottom: Timeline
  - Right: Properties/effects panel (future)
- **Acceptance Criteria**:
  - All panels visible on 1920x1080 screen
  - Panels resizable with drag handles
  - Layout persists across sessions

#### FR-7.2: Toolbar
- **Requirement**: Quick access to primary actions
- **Implementation**:
  - Icon buttons with labels
  - Import, Record, Export actions
  - Undo/Redo buttons
  - Settings/preferences button
  - Help/documentation link
- **Acceptance Criteria**:
  - All buttons have tooltips
  - Disabled states clear (grayed out)
  - Icons intuitive and consistent

#### FR-7.3: Keyboard Shortcuts
- **Requirement**: Efficient editing via keyboard
- **Implementation**:
  - Spacebar: Play/Pause
  - Cmd/Ctrl + I: Import
  - Cmd/Ctrl + E: Export
  - Cmd/Ctrl + K: Split clip
  - Delete/Backspace: Delete selected
  - Cmd/Ctrl + Z: Undo
  - Cmd/Ctrl + Shift + Z: Redo
  - Arrow keys: Move playhead
  - +/-: Zoom timeline
- **Acceptance Criteria**:
  - All shortcuts documented
  - No conflicts with OS shortcuts
  - Shortcuts work consistently

#### FR-7.4: Dark Mode Theme
- **Requirement**: Modern dark UI for video editing
- **Implementation**:
  - Dark gray background (#1e1e1e)
  - Lighter panels (#2d2d2d)
  - Accent color (blue) for interactive elements
  - High contrast for text
  - Subtle shadows and borders
- **Acceptance Criteria**:
  - No eyestrain during long sessions
  - Text readable at all sizes
  - Consistent color usage
  - Smooth transitions between states

#### FR-7.5: Responsive Behavior
- **Requirement**: Adapt to different window sizes
- **Implementation**:
  - Min window size: 1280x720
  - Panels collapse intelligently
  - Timeline always visible
  - Player scales proportionally
- **Acceptance Criteria**:
  - No UI clipping at min size
  - All features accessible at all sizes
  - Smooth resize transitions

---

### FR-8: Project Management

#### FR-8.1: Project Files
- **Requirement**: Save and load project state
- **Implementation**:
  - JSON file format (.zapcut extension)
  - Contains clip references (not video data)
  - Timeline state, tracks, playhead position
  - User preferences
- **Acceptance Criteria**:
  - Projects load completely
  - File paths resolved correctly
  - Missing files handled gracefully

#### FR-8.2: Auto-Save
- **Requirement**: Prevent data loss
- **Implementation**:
  - Save to temp file every 30 seconds
  - Dirty flag tracks unsaved changes
  - Prompt before closing with unsaved changes
  - Crash recovery on next launch
- **Acceptance Criteria**:
  - Auto-save doesn't block UI
  - User notified of auto-save status
  - Recovery file cleaned up on normal exit

#### FR-8.3: Undo/Redo System
- **Requirement**: Revert and reapply actions
- **Implementation**:
  - Command pattern for all timeline edits
  - Stack of max 50 undo states
  - Keyboard shortcuts (Cmd/Ctrl + Z)
  - Visual indicator of undo/redo availability
- **Acceptance Criteria**:
  - All edits undoable
  - Undo history cleared on project load
  - No crashes from repeated undo/redo

---

## Non-Functional Requirements

### NFR-1: Performance

#### NFR-1.1: Application Launch Time
- **Target**: < 5 seconds cold start, < 2 seconds warm start
- **Measurement**: Time from app icon click to main UI interactive
- **Optimization Strategies**:
  - Lazy load non-critical modules
  - Cache project thumbnails
  - Minimize initial bundle size

#### NFR-1.2: Timeline Responsiveness
- **Target**: 60fps with 10+ clips, 30fps with 20+ clips
- **Measurement**: Frame rate during timeline interactions (pan, zoom, drag)
- **Optimization Strategies**:
  - Canvas-based rendering (react-konva)
  - Virtualization for off-screen clips
  - Throttle/debounce expensive operations

#### NFR-1.3: Playback Smoothness
- **Target**: 30fps minimum during preview playback
- **Measurement**: Dropped frames percentage (should be <5%)
- **Optimization Strategies**:
  - Hardware-accelerated video decoding
  - Preload clips near playhead
  - Reduce real-time compositing complexity

#### NFR-1.4: Export Speed
- **Target**: ≥1x realtime (5min video exports in ≤5min)
- **Measurement**: Export duration vs. timeline duration
- **Optimization Strategies**:
  - Hardware encoding (VideoToolbox, NVENC)
  - Multi-threaded FFmpeg
  - Optimize FFmpeg filters

#### NFR-1.5: Memory Usage
- **Target**: < 500MB idle, < 2GB with 10 clips loaded
- **Measurement**: Resident memory over 15-minute session
- **Optimization Strategies**:
  - Release clip buffers when off-screen
  - Limit thumbnail resolution
  - Clear undo history periodically

#### NFR-1.6: File Size Optimization
- **Target**: Exported files ≤120% of optimal size for given quality
- **Measurement**: Compare file size to reference encoders
- **Optimization Strategies**:
  - Proper bitrate calculation
  - Two-pass encoding for large exports
  - Profile-based presets

### NFR-2: Reliability

#### NFR-2.1: Crash Resistance
- **Target**: Zero crashes during normal use
- **Measurement**: Crash reports per 100 user sessions
- **Implementation**:
  - Error boundaries in React
  - Rust panic handlers
  - Graceful degradation

#### NFR-2.2: Export Success Rate
- **Target**: 99% successful exports (no FFmpeg errors)
- **Measurement**: Export completions vs. failures
- **Implementation**:
  - Validate timeline before export
  - Retry logic for transient errors
  - Detailed error logging

#### NFR-2.3: Data Integrity
- **Target**: Zero data loss in saved projects
- **Measurement**: Project files load correctly 100% of time
- **Implementation**:
  - Atomic file writes
  - Backup previous version before overwrite
  - Checksum validation

### NFR-3: Compatibility

#### NFR-3.1: Operating Systems
- **Supported**: macOS 11+, Windows 10+
- **Target Distribution**: Universal binary (macOS), x64 + ARM (Windows)
- **Testing**: Test on min and current OS versions

#### NFR-3.2: Video Formats
- **Import**: MP4 (H.264, H.265), MOV (ProRes, H.264), WebM (VP8, VP9)
- **Export**: MP4 (H.264)
- **Future**: AVI, MKV, GIF

#### NFR-3.3: Minimum Hardware
- **CPU**: Intel i5 (8th gen) or Apple M1
- **RAM**: 8GB minimum, 16GB recommended
- **GPU**: Integrated graphics sufficient
- **Storage**: 500MB install + temp space for exports

### NFR-4: Usability

#### NFR-4.1: Learning Curve
- **Target**: First successful edit within 5 minutes
- **Measurement**: User testing with non-editors
- **Implementation**:
  - Onboarding tutorial
  - Tooltips on all buttons
  - Contextual help

#### NFR-4.2: Accessibility
- **Target**: WCAG 2.1 Level AA for critical UI
- **Implementation**:
  - Keyboard navigation
  - High contrast mode
  - Screen reader compatibility (future)

#### NFR-4.3: Error Messages
- **Target**: All errors have clear, actionable messages
- **Implementation**:
  - No technical jargon
  - Suggest solutions
  - Link to documentation

### NFR-5: Security

#### NFR-5.1: File System Access
- **Requirement**: Only access user-selected files
- **Implementation**:
  - Tauri's scoped file system API
  - Explicit permissions for folders
  - No background file scanning

#### NFR-5.2: Network Isolation
- **Requirement**: No network requests (offline-first)
- **Implementation**:
  - All processing local
  - No telemetry or analytics
  - No automatic updates (manual check)

### NFR-6: Maintainability

#### NFR-6.1: Code Quality
- **Standards**:
  - TypeScript strict mode
  - ESLint + Prettier
  - Rust clippy warnings as errors

#### NFR-6.2: Documentation
- **Requirements**:
  - All public APIs documented
  - Architecture decision records
  - Setup and build instructions

---

## User Experience Specifications

### UX-1: First Launch Experience

#### Onboarding Flow
1. **Welcome Screen**
   - Brief intro to ZapCut
   - Key features highlighted
   - "Create New Project" button
   - "Open Example Project" button

2. **Quick Start Tutorial** (Optional, skippable)
   - 3-step interactive guide:
     1. Import a clip
     2. Place on timeline
     3. Export video
   - Progress indicator (1/3, 2/3, 3/3)
   - Can be reopened later from Help menu

3. **Main Workspace**
   - Empty state messaging: "Drag videos here or click Import"
   - Sample video available to download
   - Tooltip hints on first hover

### UX-2: Core Workflows

#### Workflow 1: Import and Arrange
```
User Goal: Create a video from 3 existing clips

Steps:
1. Click "Import" button or drag files into media library
2. Thumbnails generate automatically
3. Drag first clip to timeline (visual snap indicators)
4. Drag second clip adjacent (auto-snap to end of first)
5. Drag third clip adjacent
6. Play preview to review sequence
7. Click "Export" button

Expected Time: < 3 minutes
```

#### Workflow 2: Record and Edit
```
User Goal: Record screen, trim out mistakes, export

Steps:
1. Click "Record" button
2. Select "Screen" option
3. Choose screen/window to capture
4. Click red record button
5. Perform actions on screen
6. Click stop button
7. Recording auto-imported to media library
8. Drag recording to timeline
9. Scrub to find mistake section
10. Click split button (Cmd+K) before mistake
11. Scrub to end of mistake
12. Click split button again
13. Select middle clip (mistake section)
14. Press Delete key
15. Play preview to verify
16. Click "Export" button

Expected Time: < 5 minutes (excluding recording duration)
```

#### Workflow 3: Multi-Track Overlay
```
User Goal: Add webcam overlay to screen recording

Steps:
1. Import or record screen footage
2. Import or record webcam footage
3. Drag screen recording to Track 0
4. Drag webcam footage to Track 1 (overlay track)
5. Resize webcam clip in preview window (future feature)
6. Position in corner of screen (future feature)
7. Trim both clips to same duration
8. Play preview to review
9. Export

Expected Time: < 5 minutes
```

### UX-3: Visual Design Principles

#### Design Language
- **Minimalist**: Reduce clutter, show only essential controls
- **Predictable**: Standard patterns (play button = triangle)
- **Responsive**: Instant feedback for all interactions
- **Forgiving**: Undo available for all actions

#### Color System
```
Primary Colors:
- Background: #1e1e1e (dark charcoal)
- Panel: #2d2d2d (lighter charcoal)
- Border: #3d3d3d (subtle separation)

Accent Colors:
- Primary Action: #3b82f6 (blue)
- Success: #10b981 (green)
- Warning: #f59e0b (orange)
- Error: #ef4444 (red)
- Playhead: #ef4444 (red)

Text Colors:
- Primary: #f9fafb (near white)
- Secondary: #9ca3af (gray)
- Disabled: #4b5563 (dark gray)
```

#### Typography
- **Font**: Inter (system fallback: -apple-system, Segoe UI)
- **Sizes**:
  - Headers: 18px, 16px
  - Body: 14px
  - Small: 12px
  - Tiny: 10px
- **Weights**:
  - Regular: 400
  - Medium: 500
  - Semibold: 600

#### Spacing System
```
Base unit: 4px
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px
```

### UX-4: Micro-Interactions

#### Hover States
- **Buttons**: Background lightens 10%, cursor changes to pointer
- **Timeline Clips**: Border highlights, resize handles appear
- **Drag Handles**: Cursor changes to resize icon

#### Transitions
- **Duration**: 150ms for most interactions, 300ms for panel changes
- **Easing**: ease-in-out for smooth feel

#### Loading States
- **Spinners**: For operations >500ms
- **Skeleton Screens**: For media library items loading
- **Progress Bars**: For deterministic operations (export, import)

#### Success Feedback
- **Toast Notifications**: 3-second auto-dismiss
- **Checkmark Animations**: For completed exports
- **Subtle Highlights**: For newly imported items

---

## Development Phases

### Phase 0: Project Setup (Week 1)

#### Milestone: Development environment ready
- Install dependencies (Node, Rust, Tauri CLI)
- Initialize Tauri + React project
- Configure TypeScript, ESLint, Prettier
- Set up FFmpeg binaries (download, bundle)
- Create basic folder structure
- Configure Tauri permissions
- Set up Git repository
- Create initial documentation

**Deliverables**:
- ✅ `npm run dev` starts app
- ✅ Hot reload working
- ✅ Tauri commands callable from frontend
- ✅ FFmpeg executable accessible

**Success Criteria**:
- App window opens with "Hello World"
- No console errors
- Build completes without warnings

---

### Phase 1: Foundation & Import (Week 2-3)

#### Milestone: Users can import and view videos

**Tasks**:
1. **Media Import Infrastructure**
   - File picker Tauri command
   - Drag & drop event handlers
   - File validation (type, size, codec)
   - FFprobe integration for metadata extraction

2. **Media Library UI**
   - Grid layout component
   - Media item cards with thumbnails
   - Thumbnail generation (FFmpeg screenshot)
   - Context menu (right-click)

3. **Video Player Component**
   - HTML5 video element wrapper
   - Play/pause controls
   - Seek bar
   - Volume control
   - Fullscreen toggle

4. **State Management**
   - Zustand store setup
   - Media store (imported clips)
   - Player store (playback state)

**Deliverables**:
- ✅ Import MP4/MOV files via picker or drag-drop
- ✅ Display thumbnails in media library
- ✅ Click clip to play in video player
- ✅ Basic playback controls work

**Success Criteria**:
- Import 5 clips without errors
- Thumbnails generate within 3 seconds each
- Video playback smooth (no stuttering)
- All metadata accurate

---

### Phase 2: Timeline Editor (Week 4-6)

#### Milestone: Users can arrange and edit clips on timeline

**Tasks**:
1. **Timeline Canvas Setup**
   - react-konva Stage and Layer
   - Time ruler component (shows seconds)
   - Track containers (minimum 2)
   - Grid and snap system

2. **Clip Rendering**
   - Clip rectangle component
   - Clip label (name, duration)
   - Clip thumbnail strip (optional)
   - Selection highlighting

3. **Drag & Drop to Timeline**
   - Drag from media library
   - Drop onto specific track
   - Ghost preview during drag
   - Snap to grid

4. **Timeline Interactions**
   - Drag clips to reorder
   - Resize handles for trimming
   - Click to select clips
   - Multi-select (Cmd/Ctrl + click)
   - Delete selected clips

5. **Playhead System**
   - Playhead line rendering
   - Draggable scrubbing
   - Click ruler to jump
   - Keyboard arrow keys to move

6. **Timeline Navigation**
   - Zoom slider (1x to 100x)
   - Pan by dragging background
   - Scrollbar for long timelines
   - Fit-to-width button

7. **State Management**
   - Timeline store (clips, tracks, playhead)
   - Selection store
   - Undo/redo command system

**Deliverables**:
- ✅ Drag clips from library to timeline
- ✅ Arrange clips horizontally
- ✅ Trim clips by dragging edges
- ✅ Split clips at playhead
- ✅ Delete clips from timeline
- ✅ Zoom and pan timeline
- ✅ Scrub playhead

**Success Criteria**:
- Timeline smooth with 10 clips (60fps)
- All interactions feel instant (<100ms)
- Undo/redo works for all actions
- No visual glitches during zoom/pan

---

### Phase 3: Timeline-Player Sync (Week 7)

#### Milestone: Video player shows timeline composition

**Tasks**:
1. **Playhead-to-Time Mapping**
   - Convert playhead position to timeline seconds
   - Account for zoom level
   - Frame-accurate positioning

2. **Clip-at-Time Resolution**
   - Find which clip(s) under playhead
   - Handle multi-track overlays
   - Calculate trimmed position within clip

3. **Player Synchronization**
   - Update player when playhead moves
   - Seek video element to correct time
   - Handle clip boundaries (switch clips)

4. **Playback Engine**
   - Continuous playback across clips
   - Auto-advance playhead during play
   - Handle gaps (pause or black frame)
   - Stop at timeline end

5. **Audio Synchronization**
   - Extract audio tracks
   - Mix multiple audio sources
   - Sync with video playback

**Deliverables**:
- ✅ Player shows correct frame at playhead
- ✅ Play button plays timeline sequentially
- ✅ Audio synchronized with video
- ✅ Handles clip transitions smoothly

**Success Criteria**:
- No audio/video desync (±50ms)
- Playback smooth (30fps minimum)
- Transitions between clips seamless
- Stop/play buttons responsive

---

### Phase 4: Export System (Week 8-9)

#### Milestone: Users can export timeline to MP4

**Tasks**:
1. **Export Dialog UI**
   - Modal with settings form
   - Resolution dropdown
   - Format selection
   - Quality presets
   - Output path picker

2. **FFmpeg Command Generation**
   - Build filter_complex from timeline
   - Handle clip trimming
   - Concatenate clips
   - Overlay tracks
   - Audio mixing

3. **Tauri Export Command**
   - Spawn FFmpeg process
   - Capture stdout/stderr
   - Parse progress output
   - Stream progress to frontend

4. **Progress UI**
   - Progress bar component
   - Percentage display
   - Time remaining estimate
   - Cancel button

5. **Post-Export Actions**
   - Validate output file
   - Success notification
   - "Open in Finder/Explorer" button
   - "Share" options (future)

**Deliverables**:
- ✅ Export button opens dialog
- ✅ Configure settings and start export
- ✅ Progress bar updates in real-time
- ✅ Exported MP4 plays correctly

**Success Criteria**:
- Export completes without errors
- Output duration matches timeline
- No quality degradation (same resolution)
- Export speed ≥1x realtime

---

### Phase 5: Recording Features (Week 10-12)

#### Milestone: Users can record screen and webcam

**Tasks**:
1. **Recording UI**
   - Recording panel component
   - Screen/webcam toggle
   - Device selection dropdowns
   - Recording controls (start, stop, pause)
   - Timer display

2. **Screen Recording (macOS)**
   - AVFoundation integration
   - Screen selection dialog
   - Capture stream to file
   - Tauri command wrapper

3. **Screen Recording (Windows)**
   - Windows.Graphics.Capture API
   - Window/display selection
   - Capture to file

4. **Webcam Recording**
   - getUserMedia() in frontend
   - Camera selection
   - MediaRecorder for encoding
   - Save to file

5. **Simultaneous Recording**
   - Two parallel streams
   - Picture-in-picture composition
   - Synchronized start/stop
   - Combined output

6. **Audio Capture**
   - Microphone selection
   - System audio (OS APIs)
   - Volume level meter
   - Multiple audio tracks

7. **Post-Recording**
   - Auto-import to media library
   - Generate thumbnail
   - Add to timeline (optional)

**Deliverables**:
- ✅ Record full screen at 30fps
- ✅ Record webcam at 720p
- ✅ Record screen + webcam simultaneously
- ✅ Capture microphone audio
- ✅ Recordings auto-imported

**Success Criteria**:
- No dropped frames (<1%)
- Audio synchronized
- Recordings playable immediately
- File sizes reasonable (not bloated)

---

### Phase 6: Polish & Optimization (Week 13-14)

#### Milestone: Production-ready app

**Tasks**:
1. **Performance Optimization**
   - Profile timeline rendering
   - Optimize FFmpeg commands
   - Reduce memory usage
   - Lazy load components
   - Cache thumbnails

2. **UI Polish**
   - Smooth animations
   - Consistent spacing
   - Icon refinements
   - Loading states
   - Error states

3. **Keyboard Shortcuts**
   - Implement all shortcuts
   - Shortcuts help modal
   - Conflict resolution

4. **Project Management**
   - Save project to .zapcut file
   - Load existing projects
   - Auto-save implementation
   - Recent projects list

5. **Error Handling**
   - Graceful degradation
   - User-friendly error messages
   - Error reporting system
   - Crash recovery

**Deliverables**:
- ✅ All performance targets met
- ✅ No visual glitches or bugs
- ✅ All shortcuts working
- ✅ Save/load projects
- ✅ Comprehensive error handling

**Success Criteria**:
- Pass all acceptance criteria
- Zero crashes in 1-hour test session
- All 6 user scenarios complete successfully
- Memory usage within targets

---

### Phase 7: Packaging & Distribution (Week 15)

#### Milestone: Installable application

**Tasks**:
1. **macOS Build**
   - Universal binary (Intel + Apple Silicon)
   - Code signing
   - Notarization
   - DMG creation
   - App icon

2. **Windows Build**
   - x64 and ARM64 installers
   - Code signing (optional)
   - MSI installer
   - App icon

3. **Documentation**
   - User manual
   - Keyboard shortcuts reference
   - Troubleshooting guide
   - Build instructions (for devs)

4. **Release Preparation**
   - Version numbering
   - Changelog
   - Release notes
   - GitHub release page

**Deliverables**:
- ✅ macOS .dmg installer
- ✅ Windows .msi installer
- ✅ User documentation
- ✅ Release notes

**Success Criteria**:
- Installers work on clean systems
- Apps launch without errors
- All features functional in packaged app
- File sizes reasonable (<200MB)

---

## Success Metrics

### Primary Metrics

#### Functionality Metrics
- **Import Success Rate**: 100% for supported formats
- **Export Success Rate**: ≥99% (no FFmpeg errors)
- **Crash Rate**: <1 per 100 sessions
- **Feature Completeness**: 100% of MVP requirements implemented

#### Performance Metrics
- **Launch Time**: <5 seconds (cold), <2 seconds (warm)
- **Timeline FPS**: ≥60fps with 10 clips, ≥30fps with 20 clips
- **Playback FPS**: ≥30fps during preview
- **Export Speed**: ≥1x realtime
- **Memory Usage**: <500MB idle, <2GB with 10 clips

#### Usability Metrics
- **Time to First Edit**: <5 minutes for new users
- **Task Completion Rate**: 100% for all 6 user scenarios
- **Error Rate**: <5% of user actions result in errors

### Secondary Metrics

#### Quality Metrics
- **Video Quality**: Exported videos match source quality
- **Audio Sync**: ±50ms maximum desync
- **Recording Quality**: No dropped frames (<1%)

#### Efficiency Metrics
- **Disk Usage**: <500MB install, <100MB per project
- **CPU Usage**: <80% during export, <30% idle
- **Battery Impact**: Minimal on laptops

---

## Risk Assessment & Mitigation

### Technical Risks

#### Risk 1: FFmpeg Integration Complexity
- **Likelihood**: High
- **Impact**: High (blocks export functionality)
- **Mitigation**:
  - Start FFmpeg integration early (Phase 1)
  - Test export with single clip immediately
  - Create comprehensive FFmpeg command builder
  - Fallback to simpler filter chains if complex ones fail
- **Contingency**: Use pre-built FFmpeg filters, limit supported operations

#### Risk 2: Platform-Specific Recording APIs
- **Likelihood**: Medium
- **Impact**: High (recording won't work)
- **Mitigation**:
  - Implement macOS first (AVFoundation simpler)
  - Use existing Rust crates for Windows APIs
  - Test on real hardware early
  - Separate concerns (recording module isolated)
- **Contingency**: Use WebRTC screen capture as fallback, though lower quality

#### Risk 3: Timeline Performance Degradation
- **Likelihood**: Medium
- **Impact**: Medium (poor UX but functional)
- **Mitigation**:
  - Use canvas rendering (react-konva) from start
  - Implement virtualization (only render visible clips)
  - Profile regularly with many clips
  - Optimize render loops
- **Contingency**: Reduce max clip count, disable animations at scale

#### Risk 4: Audio/Video Synchronization
- **Likelihood**: Medium
- **Impact**: High (unusable output)
- **Mitigation**:
  - Use proven libraries (Web Audio API)
  - Test sync continuously during development
  - Add sync adjustment controls if needed
  - Rely on FFmpeg's proven muxing
- **Contingency**: Export video-only first, add audio later

#### Risk 5: Memory Leaks
- **Likelihood**: Medium
- **Impact**: Medium (app unusable after extended use)
- **Mitigation**:
  - Profile memory regularly
  - Clean up resources in useEffect hooks
  - Limit thumbnail cache size
  - Use WeakMap for clip references
- **Contingency**: Add "Clear Cache" button, restart recommendation

### Resource Risks

#### Risk 6: Development Time Overrun
- **Likelihood**: High (complex project)
- **Impact**: Medium (delays launch)
- **Mitigation**:
  - Strict MVP scope (Phase 1-4 only)
  - Defer non-essential features
  - Weekly progress reviews
  - Prioritize ruthlessly
- **Contingency**: Ship with subset of features, iterate

#### Risk 7: Cross-Platform Testing Delays
- **Likelihood**: Medium
- **Impact**: Medium (Windows version delayed)
- **Mitigation**:
  - Focus macOS first (single platform)
  - Abstract platform-specific code early
  - Virtual machines for testing
  - Automated builds for both platforms
- **Contingency**: Ship macOS first, Windows later

### User Experience Risks

#### Risk 8: Complexity Creep
- **Likelihood**: High (feature requests)
- **Impact**: Medium (overwhelming UX)
- **Mitigation**:
  - Strict adherence to MVP features
  - User testing with target personas
  - Say "no" to non-essential requests
  - Keep UI minimal
- **Contingency**: Hide advanced features behind "Advanced" toggle

#### Risk 9: Unclear Error Messages
- **Likelihood**: Medium
- **Impact**: Medium (support burden)
- **Mitigation**:
  - Write user-friendly error text
  - Test error scenarios deliberately
  - Include actionable suggestions
  - Link to documentation
- **Contingency**: Add "Get Help" button in errors

---

## Dependencies & Integrations

### Core Dependencies

#### Frontend
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "typescript": "^5.0.0",
  "zustand": "^4.5.0",
  "react-konva": "^18.2.0",
  "konva": "^9.2.0",
  "@tauri-apps/api": "^2.0.0",
  "tailwindcss": "^3.4.0",
  "lucide-react": "^0.300.0"
}
```

#### Backend (Rust)
```toml
[dependencies]
tauri = { version = "2.0", features = ["shell-open"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1.35", features = ["full"] }
```

#### System Dependencies
- **FFmpeg**: v6.0+ (bundled with app)
- **FFprobe**: v6.0+ (bundled with app)

### External APIs

#### macOS
- **AVFoundation**: Screen recording
- **Core Media**: Video processing
- **Core Audio**: Audio capture

#### Windows
- **Windows.Graphics.Capture**: Screen recording
- **Media Foundation**: Video processing
- **WASAPI**: Audio capture

#### Web APIs (via Tauri)
- **getUserMedia()**: Webcam access
- **MediaRecorder**: Video encoding
- **Web Audio API**: Audio playback
- **FileReader**: File handling

### Optional Integrations (Future)
- **Cloud Storage**: Google Drive, Dropbox
- **Social Media**: Direct upload to YouTube, TikTok
- **Stock Media**: Unsplash, Pexels integration
- **Music Libraries**: Royalty-free music

---

## Appendix

### Glossary

- **Clip**: A video file or segment placed on the timeline
- **Timeline**: The editing workspace where clips are arranged sequentially
- **Track**: A horizontal layer on the timeline (for overlays)
- **Playhead**: The vertical line indicating current time position
- **Trim**: Adjusting the start/end points of a clip
- **Split**: Dividing a clip into two separate clips
- **Scrubbing**: Dragging the playhead to preview different sections
- **Export**: Rendering the timeline to a final video file
- **Codec**: Video compression format (H.264, H.265, etc.)
- **Bitrate**: Data rate of video/audio (higher = better quality)
- **Frame Rate**: Frames per second (fps)

### Reference Materials

**Project Resources:**
- **ZapCut Website**: https://zapcut.archlife.org
- **ZapCut GitHub**: https://github.com/Zernach/zapcut

**Technical Documentation:**
- **Tauri Documentation**: https://tauri.app/
- **FFmpeg Documentation**: https://ffmpeg.org/documentation.html
- **React Konva**: https://konvajs.org/docs/react/
- **Web Audio API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Oct 28, 2025 | Initial PRD |

---

**End of Product Requirements Document**

