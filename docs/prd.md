# Phonoglyph Product Requirements Document (PRD)

## Goals and Background Context

### Goals

* To provide music producers and content creators with a simple, web-based tool to generate compelling, customized visuals synced to their music.
* To offer a simpler, more accessible alternative to complex creative coding software like TouchDesigner or p5.js.
* To enable users to create short-form video content suitable for social media platforms.
* To establish a tiered SaaS model with free and paid features to support both casual and power users.
* To minimize technical barriers by automating musical analysis and visualization control.

### Background Context

Phonoglyph is a web-based SaaS platform designed for musicians and content creators. The core problem it solves is the difficulty and high technical barrier required to create engaging, music-synced visuals for social media. While professional tools exist, they have a steep learning curve. Phonoglyph offers two powerful approaches: (1) Direct MIDI file visualization for precise control, and (2) Automated stem separation and audio analysis for instant results from any audio file. The platform provides a curated set of high-quality visualization styles ("Data Viz", "Gradient Flow", "Light Waves") and color schemes that users can apply instantly, with a real-time preview editor and a backend rendering pipeline for high-quality video output.

### Change Log

| Date       | Version | Description     | Author |
| :--------- | :------ | :-------------- | :----- |
| 2025-06-25 | 1.0     | Initial Draft | PM     |
| 2025-06-26 | 1.1     | Added stem separation & audio analysis | PM     |

## Requirements

### Functional

* **FR1**: Users must be able to upload either a MIDI file or a single audio file.
* **FR2**: The system must automatically separate uploaded audio files into stems (drums, bass, vocals, other).
* **FR3**: The system must perform real-time audio analysis to extract musical features for visualization control.
* **FR4**: Users must be able to optionally upload an audio file (.mp3, .wav) to sync with MIDI visualizations.
* **FR5**: The system must provide a real-time, low-resolution preview of the visualization in the editor.
* **FR6**: Users must be able to select from predefined visualization styles.
* **FR7**: Users must be able to select from predefined color schemes.
* **FR8**: All users, including guests, must be able to create custom color schemes.
* **FR9**: Authenticated users must be able to initiate a high-resolution video render from the backend.
* **FR10**: Users must receive real-time progress updates for their render jobs.
* **FR11**: Users must be able to download the completed video file.
* **FR12**: Guest users must be required to sign up or log in before downloading a final rendered video.
* **FR13**: The system must support Stripe integration for subscription payments.
* **FR14**: The system must provide intelligent mapping of audio features to visualization parameters.
* **FR15**: Users must be able to customize how different stems influence the visualization.

### Non Functional

* **NFR1**: The backend rendering pipeline must target a completion time of less than 2 minutes for files up to 3 minutes in duration.
* **NFR2**: The stem separation process must complete within 2 minutes for a 5-minute song.
* **NFR3**: Real-time audio analysis must maintain 60fps on modern devices.
* **NFR4**: The platform must be architected to handle at least 100 concurrent render/separation jobs.
* **NFR5**: The user interface must be responsive and functional on modern web browsers on desktop and mobile.
* **NFR6**: Audio analysis must gracefully degrade on lower-powered devices while maintaining usability.

## User Interface Design Goals

### Overall UX Vision

The user experience should be intuitive and immediate. A user should be able to go from uploading a single audio file to seeing a compelling visual in seconds, with no technical knowledge required. For advanced users, MIDI upload provides additional control. The interface will be clean and minimalist, focusing the user's attention on the visualizer canvas while providing intuitive controls for stem and visualization parameters.

### Core Screens and Views

* **Landing/Upload Page**: A simple page with clear upload options for audio or MIDI files.
* **Editor View**: The main interface, featuring:
  * Real-time preview canvas
  * Stem mixing controls
  * Visualization style selector
  * Color scheme controls
  * Render settings
* **Dashboard/Projects View**: For authenticated users to view their past projects and rendered videos.
* **Pricing/Subscription Page**: Outlines the different subscription tiers.
* **Login/Sign-up Page**: For user authentication.

### Target Device and Platforms

Web Responsive, targeting modern desktop browsers (Chrome, Firefox, Safari, Edge) and mobile web browsers.

## Technical Assumptions

### Repository Structure: Monorepo
### Service Architecture: Microservices-oriented with Serverless Components
### Testing requirements: 
* Unit and Integration tests for backend services
* Component and E2E tests for the frontend
* Performance testing for audio analysis and stem separation
* Cross-browser compatibility testing

## Epics

* **Epic 1: Foundation & Core Upload**: Establish project setup, CI/CD, user authentication, and the ability for users to upload MIDI/audio files and see a basic, non-configurable visualization.
* **Epic 2: Interactive Visualization Engine**: Implement the real-time preview engine with selectable visualization styles (`three.js`/`p5.js`) and custom color schemes.
* **Epic 3: Backend Rendering & User Accounts**: Develop the backend rendering pipeline using a message queue and FFmpeg. Implement user dashboards for viewing projects and downloading completed videos.
* **Epic 4: Remotion Video Composition Platform**: Build the video composition and rendering system using Remotion for high-quality output.
* **Epic 5: Stem Separation & Audio Analysis**: Implement serverless audio stem separation and real-time analysis to provide a lower-friction alternative to MIDI file uploads, enabling automatic visualization control from single audio files.