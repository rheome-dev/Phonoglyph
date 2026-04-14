```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#1a1a2e', 'primaryTextColor': '#eee', 'primaryBorderColor': '#4a4a6a', 'lineColor': '#6a6a8a', 'secondaryColor': '#16213e', 'tertiaryColor': '#0f3460'}}}%%
flowchart TB
    subgraph Client["<b>Client Browser</b>"]
        direction TB
        NextJS["Next.js 14<br/>App Router"]
        React["React 18<br/>Components"]
        ThreeJS["Three.js<br/>WebGL Renderer"]
        Zustand["Zustand<br/>State Stores"]
        TRPC_Client["tRPC Client"]
    end

    subgraph Visualizer["<b>Visualization Engine</b>"]
        VM["VisualizerManager<br/>(Orchestrator)"]
        MC["MultiLayerCompositor<br/>(GPU Blending)"]
        ATM["AudioTextureManager<br/>(GPU Textures)"]
        Effects["40+ Shader Effects<br/>(Bloom, Glitch, etc.)"]
    end

    subgraph Stores["<b>State Management</b>"]
        VS["visualizerStore"]
        TS["timelineStore"]
        PS["projectSettingsStore"]
    end

    subgraph External_Services["<b>External Services</b>"]
        Supabase["Supabase<br/>(Auth + PostgreSQL)"]
        R2["Cloudflare R2<br/>(Object Storage)"]
        RunPod["RunPod<br/>(GPU Stem Separation)"]
        RemotionLambda["Remotion Lambda<br/>(Video Rendering)"]
    end

    subgraph Backend["<b>Backend API (Express + tRPC)</b>"]
        Express["Express Server<br/>(Port 3001)"]
        TRPC_Server["tRPC Server"]

        subgraph Routers["<b>tRPC Routers (13)</b>"]
            AuthR["auth"]
            FileR["file"]
            StemR["stem"]
            RenderR["render"]
            ProjectR["project"]
            AudioAnalysisR["audio-analysis-sandbox"]
            MIDIR["midi"]
            AssetR["asset"]
            AutoSaveR["auto-save"]
            GuestR["guest"]
            UserR["user"]
            HealthR["health"]
        end

        subgraph Services["<b>Services Layer</b>"]
            R2Svc["r2-storage"]
            AudioAn["audio-analyzer"]
            StemProc["stem-processor"]
            MediaProc["media-processor"]
            MIDIPars["midi-parser"]
            AssetMgr["asset-manager"]
        end
    end

    subgraph Database["<b>Database (PostgreSQL)</b>"]
        AuthDB["auth.users"]
        FilesDB["file_metadata"]
        ProjectsDB["projects"]
        StemsDB["stem_separation_jobs"]
        AudioCache["audio_analysis_cache"]
    end

    subgraph Remotion["<b>Remotion Export</b>"]
        RemEntry["index.ts<br/>(registerRoot)"]
        RootComp["Root.tsx<br/>(Composition Registry)"]
        RayboxComp["RayboxComposition"]
        Overlay["RemotionOverlayRenderer"]
    end

    %% Client to Visualizer connections
    NextJS --> React
    React --> ThreeJS
    React --> Stores
    ThreeJS --> VM
    VM --> MC
    VM --> ATM
    VM --> Effects
    MC --> Effects

    %% State connections
    Stores --> VS
    Stores --> TS
    Stores --> PS
    VS -.-> VM
    TS -.-> VM
    PS -.-> VM

    %% Client to Backend
    TRPC_Client --> TRPC_Server
    React --> TRPC_Client

    %% Backend structure
    Express --> TRPC_Server
    TRPC_Server --> Routers
    Routers --> Services
    Services --> R2Svc
    Services --> AudioAn
    Services --> StemProc

    %% Backend to External Services
    R2Svc --> R2
    AudioAn --> Supabase
    StemProc --> RunPod
    RenderR --> RemotionLambda

    %% Backend to Database
    Services --> Database
    AuthR --> AuthDB
    FileR --> FilesDB
    ProjectR --> ProjectsDB
    StemR --> StemsDB
    AudioAnalysisR --> AudioCache

    %% Remotion connections
    RemEntry --> RootComp
    RootComp --> RayboxComp
    RayboxComp --> Overlay
    Overlay --> VM
    VM -->|"60fps Frames"| Overlay
    RenderR --> Remotion

    %% Styling
    classDef client fill:#1a1a2e,stroke:#4a4a6a,color:#eee
    classDef engine fill:#16213e,stroke:#4a4a6a,color:#eee
    classDef backend fill:#0f3460,stroke:#4a4a6a,color:#eee
    classDef service fill:#1f4068,stroke:#4a4a6a,color:#eee
    classDef db fill:#2c2c54,stroke:#4a4a6a,color:#eee
    classDef external fill:#3d1a54,stroke:#6a4a8a,color:#eee

    class NextJS,React,ThreeJS,Zustand,TRPC_Client client
    class VM,MC,ATM,Effects engine
    class Express,TRPC_Server,Routers,Services backend
    class R2Svc,AudioAn,StemProc,MIDIPars,AssetMgr service
    class Database,AuthDB,FilesDB,ProjectsDB,StemsDB,AudioCache db
    class Supabase,R2,RunPod,RemotionLambda external
```

---

## Architecture Diagram: Phonoglyph System

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant NextJS as Next.js
    participant Visualizer
    participant API as Express/tRPC
    participant R2 as Cloudflare R2
    participant DB as PostgreSQL
    participant RunPod
    participant Remotion

    Note over User,Browser: User Flow: Audio Upload & Visualization

    User->>Browser: Upload audio file
    Browser->>NextJS: POST /api/trpc/file.upload
    NextJS->>API: file.upload procedure
    API->>R2: Upload audio to R2
    R2-->>API: Upload confirmation
    API->>DB: Store file metadata
    DB-->>API: Confirm storage
    API-->>Browser: Return file URL

    Browser->>NextJS: Request audio analysis
    NextJS->>API: audioAnalysisSandbox procedure
    API->>RunPod: Process with Meyda/FFmpeg
    RunPod-->>API: Return audio features
    API->>DB: Cache features
    API-->>Browser: Return features

    Browser->>Visualizer: Initialize with features
    Visualizer->>Visualizer: 1. Create Three.js scene
    Visualizer->>Visualizer: 2. Init AudioTextureManager
    Visualizer->>Visualizer: 3. Init MultiLayerCompositor
    Visualizer->>Visualizer: 4. Register 40+ effects
    loop 60fps Animation
        Visualizer->>Visualizer: Read audio position
        Visualizer->>Visualizer: Update GPU textures
        Visualizer->>Visualizer: Render effects to targets
        Visualizer->>Visualizer: Composite layers
        Visualizer-->>Browser: Canvas frame
    end

    Note over User,Remotion: Video Export Flow

    User->>Browser: Configure & export video
    Browser->>NextJS: render.start procedure
    NextJS->>API: Validate composition
    API->>Remotion: Start render job
    loop Frame rendering
        Remotion->>Visualizer: Render frame
        Visualizer-->>Remotion: Return frame
    end
    Remotion-->>API: Video complete
    API->>R2: Store video
    API-->>Browser: Return video URL
```

---

## Data Flow Architecture

```mermaid
flowchart LR
    subgraph Input
        Audio[Audio File]
        MIDI[MIDI File]
    end

    subgraph Processing
        StemSep[Stem Separation]
        AudioFeat[Audio Feature Extraction]
    end

    subgraph Storage
        R2[(Cloudflare R2)]
        PG[(PostgreSQL)]
    end

    subgraph Rendering
        WebGL[WebGL Renderer]
        Rem[Remotion]
    end

    subgraph Output
        Canvas[Browser Canvas]
        Video[MP4 Video]
    end

    Audio --> StemSep
    StemSep --> AudioFeat
    AudioFeat --> WebGL
    WebGL --> Canvas
    AudioFeat --> Rem
    Rem --> Video

    StemSep --> R2
    AudioFeat --> PG
    MIDI --> R2
```

---

## Component Hierarchy

```mermaid
mindmap
  root((Phonoglyph))
    Frontend
      Next.js 14
        App Router
          Pages
            Home
            Login/Signup
            Creative Visualizer
            Dashboard
            Files
        Components
          UI primitives
          Audio Analysis
          Stem Separation
          Video Composition
      Visualization Engine
        VisualizerManager
        MultiLayerCompositor
        AudioTextureManager
        40+ Effects
      State Management
        visualizerStore
        timelineStore
        projectSettingsStore
    Backend
      Express Server
      tRPC
        13 Routers
      Services
        r2-storage
        audio-analyzer
        stem-processor
        midi-parser
    External Services
      Supabase
        Auth
        PostgreSQL
      Cloudflare R2
      RunPod
      Remotion Lambda
    Database
      users
      files
      projects
      audio_analysis_cache
```

---

## Technology Stack Summary

```mermaid
flowchart TB
    subgraph Frontend["Frontend Stack"]
        F1[Next.js 14]
        F2[React 18]
        F3[TypeScript 5.3]
        F4[Three.js]
        F5[Tailwind CSS]
        F6[Zustand]
    end

    subgraph Backend["Backend Stack"]
        B1[Express 4]
        B2[tRPC 10]
        B3[TypeScript]
        B4[PostgreSQL]
    end

    subgraph Services["Infrastructure"]
        S1[Supabase]
        S2[Cloudflare R2]
        S3[RunPod]
        S4[Remotion]
    end

    F1 --> B2
    F2 --> B2
    F4 --> F6
    B2 --> B1
    B1 --> B4
    B4 --> S1
    B1 --> S2
    B1 --> S3
    B1 --> S4
```

---

*Generated from .planning/codebase documentation on 2026-02-24*
