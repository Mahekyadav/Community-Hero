<div align="center">
<img width="1200" height="475" alt="Community Hero Banner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />

# 🏙️ Community Hero

### *Smart Governance & Automated Jurisdictional Routing Platform*

[![View in AI Studio](https://img.shields.io/badge/Google%20AI%20Studio-Project%20Workspace-blue?logo=google&logoColor=white&style=for-the-badge)](https://ai.studio/apps/bb0da428-f479-4660-9c9e-8bbf3de6fee7)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black&style=for-the-badge)](https://react.dev)
[![Firebase](https://img.shields.io/badge/Firebase-v12-FFCA28?logo=firebase&logoColor=black&style=for-the-badge)](https://firebase.google.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white&style=for-the-badge)](https://www.typescriptlang.org)

</div>

---

## 🚀 Project Overview

**Community Hero** is a full-stack smart city management platform designed to bridge the gap between citizens and local municipalities. Citizens can instantaneously report infrastructure, sanitation, or safety anomalies via an interactive map interface.

The application utilizes an automated three-tier matching engine that instantly isolates and routes incoming complaints to the **exact Municipal Officer** responsible for that specific **City, Ward, and Department** jurisdiction.

---

## ✨ Key Features

* **Dynamic GIS Mapping (100% Free):** Integrated Leaflet.js and OpenStreetMap layers that auto-detect coordinates using the browser's native Geolocation API, bypassing costly proprietary mapping solutions.
* **Intelligent Jurisdictional Routing:** Automated filtering logic ensures Municipal Officers only see active, color-coded work orders matching their designated service zone and department profile.
* **Two-Step Resolution Lifecycle:** Officers can dynamically transition cases to *In Progress* and resolve them via custom documentation panels with real-time UI synchronization (`onSnapshot` streams).
* **Secure Enterprise Gates:** Multi-role authorization profiles protected by strict route guards and a manual Admin Approval gateway for new municipal staff sign-ups.
* **Gamified Civic Engagement:** An automated rewards loop that dynamically increments a citizen's profile by **+10 points** the moment their reported issue is marked as resolved.
* **Real-Time Notification Engine:** Live `onSnapshot` bell in the navbar delivers push-style notifications to citizens on resolution events and status changes — with unread badge counts and per-notification mark-as-read.
* **AI-Assisted Resolution Summaries:** Officers can generate Gemini-powered public-facing resolution narratives directly from the resolution modal before closing a case.
* **Citizen GPS Auto-Location:** On first sign-in, the app silently reverse-geocodes the user's browser GPS position (via Nominatim / OpenStreetMap) and pre-populates city and ward fields on their profile.

---

## 🛠️ Setup & Running Locally

### Prerequisites

* [Node.js](https://nodejs.org/) (v18+ recommended)
* A Firebase Project Instance (Firestore + Authentication enabled)
* A Google AI Studio / Gemini API key

### 1. Installation

Clone the repository and install the project dependencies:

```bash
git clone <your-repo-url>
cd community-hero
npm install
```

### 2. Environment Variables

Create a `.env` file in the project root. All `VITE_` prefixed variables are inlined by Vite at build time and must be set in **Vercel → Project Settings → Environment Variables** for production deployments.

```env
# ── Firebase ────────────────────────────────────────────────────────────────
# Find these in Firebase Console → Project Settings → General → Your apps
VITE_FIREBASE_API_KEY="your_api_key"
VITE_FIREBASE_AUTH_DOMAIN="your_project.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your_project_id"
VITE_FIREBASE_STORAGE_BUCKET="your_project.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
VITE_FIREBASE_APP_ID="your_app_id"
# Optional — only needed if using a named Firestore database (not the default)
# VITE_FIREBASE_DATABASE_ID=""

# ── Gemini AI ───────────────────────────────────────────────────────────────
# Required for AI-powered resolution summaries (server-side only, no VITE_ prefix)
GEMINI_API_KEY="your_gemini_api_key"

# ── Server ──────────────────────────────────────────────────────────────────
APP_URL="http://localhost:5173"
```

### 3. Enable Firebase Services

In the Firebase Console before running:
- **Authentication** → Sign-in method → enable **Email/Password** and **Google**
- **Firestore Database** → Create database (Start in test mode for development)

### 4. Run the Development Server

```bash
npm run dev
```

The app starts at **http://localhost:5173** by default.

### 5. Production Build

```bash
npm run build   # Compiles the Vite frontend + bundles the Express server
npm start       # Serves the compiled production bundle
```

---

## 👥 User Roles & Access

The platform enforces three distinct role-based access tiers, each with its own protected route guard:

| Role | Access | Notes |
|---|---|---|
| **Citizen** | `/dashboard`, `/report` | Reports issues, upvotes/verifies community reports, earns gamification points |
| **Municipal Officer** | `/officer`, `/officer/profile` | Receives direct work-order assignments matched to their City + Ward + Department profile; resolves issues via two-step flow |
| **Admin** | `/admin`, `/admin/profile` | Full system telemetry, user role management, officer approval queue |

> **Officer Sign-Up Flow:** New officers register with extra credentials (Badge ID, Department, City, Ward). Their account enters a **`pending`** state and is locked to a holding screen until an Admin approves them via the dashboard.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 19 + TypeScript 5.8 |
| **Build Tool** | Vite 6 |
| **UI Component Library** | Material UI (MUI) v9 |
| **Styling** | Tailwind CSS v4 |
| **Routing** | React Router DOM v7 |
| **Backend / Server** | Node.js + Express (thin API layer) |
| **Database** | Firebase Firestore (real-time `onSnapshot` streams) |
| **Authentication** | Firebase Auth v12 (Email/Password + Google OAuth) |
| **Mapping** | Leaflet.js + react-leaflet v5 + OpenStreetMap tiles |
| **Geocoding** | Nominatim (OpenStreetMap Reverse Geocoding API — free, no key) |
| **AI / LLM** | Google Gemini via `@google/genai` SDK |
| **Icons** | Lucide React |
| **Animations** | Motion (formerly Framer Motion) |

---

## 🗂️ Firestore Data Architecture

```
firestore/
├── users/{uid}
│   ├── displayName, email, role (citizen|officer|admin)
│   ├── status (pending|approved)   ← officers only
│   ├── city, ward, department       ← officer/admin jurisdiction
│   ├── badgeId, contactNumber
│   ├── heroPoints, pointsEarned    ← citizen gamification
│   └── badges[]
│
├── issues/{issueId}
│   ├── title, description, category, priority, status
│   ├── latitude, longitude, address, city, ward
│   ├── createdBy, creatorName
│   ├── assignedOfficerId, assignedOfficerName
│   ├── resolutionDescription
│   ├── upvotesCount, verificationsCount, confidenceScore
│   ├── upvotedBy[], verifiedBy[]
│   ├── aiAnalysis { resolutionSummary, suggestedDepartment, ... }
│   ├── createdAt, updatedAt
│   └── comments/ (subcollection)
│       └── {commentId} { userId, userName, content, isVerification, createdAt }
│
└── notifications/{notifId}
    ├── userId, title, message
    ├── read (boolean)
    ├── relatedIssueId
    └── createdAt
```

---

## 🔄 Issue Lifecycle

```
Citizen Reports Issue
        │
        ▼
   [Pending] ──► (Community upvotes/verifications) ──► [Verified]
        │
        ▼
Officer matches City + Ward + Department
        │
        ▼
Officer clicks "Begin Resolution"
        │
        ▼
   [In Progress]  ← Citizen receives notification
        │
        ▼
Officer submits resolution notes (+ optional AI summary)
        │
        ▼
   [Resolved]  ← Citizen receives +10 points & notification
               ← All 4 writes committed as atomic Firestore batch
```

---

## 🔐 Key Engineering Decisions

**Live Profile Sync via `onSnapshot`**
The AuthContext replaces the one-time `getDoc` profile fetch with a persistent Firestore `onSnapshot` listener. When an officer updates their City/Ward/Department from the profile page, the work-order queue filter updates instantly — no re-login required.

**Atomic Resolution Batch**
The `handleMarkResolved` function uses Firestore `writeBatch` to commit 4 operations atomically: resolving the issue, incrementing the citizen's `pointsEarned` by 10, and creating both resolution and points notifications. Either all succeed or none do.

**Zero-Cost GIS Stack**
All mapping, geocoding, and tile rendering uses 100% free, open-source infrastructure (Leaflet + OpenStreetMap + Nominatim). No Google Maps API key or billing account required.

**Deterministic Ward Assignment**
Since municipal ward boundaries aren't queryable via free geocoding APIs, ward assignment uses a stable hash function on GPS coordinates: `WARDS[abs(round(lat × 13 + lng × 7)) % WARDS.length]`. The same GPS fix always maps to the same ward — consistent for demo purposes.

---

## 📁 Project Structure

```
community-hero/
├── src/
│   ├── components/
│   │   ├── Navbar.tsx          # Real-time notification bell + auth menu
│   │   ├── IssueCard.tsx       # Fixed-aspect card with text clamping
│   │   ├── MapContainer.tsx    # Leaflet map wrapper
│   │   ├── AIChatAssistant.tsx # Floating Gemini chat widget
│   │   └── Footer.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx     # Live profile onSnapshot, GPS auto-resolve
│   ├── pages/
│   │   ├── LandingPage.tsx
│   │   ├── AuthPage.tsx        # Expandable officer sign-up form
│   │   ├── CitizenDashboard.tsx
│   │   ├── ReportIssuePage.tsx # Interactive map + AI categorization
│   │   ├── OfficerDashboard.tsx # Active Queue + Resolution Archives tabs
│   │   ├── OfficerProfilePage.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── AdminProfilePage.tsx
│   │   └── PendingApprovalPage.tsx
│   ├── types.ts                # Shared TypeScript interfaces
│   ├── constants.ts            # DEPARTMENTS + WARDS shared arrays
│   ├── firebase.ts             # Firebase init + error handler
│   └── App.tsx                 # Route guards + AppErrorBoundary
├── firebase-applet-config.json # Firebase SDK credentials (git-ignored)
├── server.ts                   # Express API server (Gemini proxy)
├── .env                        # GEMINI_API_KEY + APP_URL
└── package.json
```

---

## 🤝 Contributing

This project was built as a hackathon submission. Pull requests and issue reports are welcome.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

## 🚀 Live Deployment
👉 [Explore Community Hero Live](https://community-hero-phi.vercel.app/)

---

<div align="center">

Built with ❤️ for smarter cities · Powered by **Google AI Studio**, **Firebase**, and **OpenStreetMap**

</div>
