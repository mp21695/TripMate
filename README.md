# TripMate — Beyond Places, Into Moments

A high-end, editorial collaborative travel platform for organizing group expeditions across India.

Inspired by cinematic editorial design, **TripMate** features optical cursor daylight reveals, interactive 3D WebGL wireframe terrain, vintage polaroid galleries, multi-day drag-and-drop itinerary workspaces, real-time UPI group expense splits, and dual aesthetic export capabilities.

---

## ✨ Features

- **Hero Viewfinder (Daylight Lens)**: Full-bleed moody Nordic/Icelandic landscape with a physics-damped rectangular lens that glides with cursor movement to reveal vivid, high-saturation daylight scenery underneath.
- **20 Iconic Indian Destinations**: Scattered polaroid gallery featuring 20 curated Indian destinations (Ladakh, Spiti Valley, Kerala, Jaipur, Varanasi, Meghalaya, Hampi, etc.) with real-time click-to-illuminate polaroid & numbered index highlighting.
- **"How We Travel" Accordion**: Horizontal expanding photographic slices (Small Group Trips, Quiet Hikes, Hidden Stays, Local Experiences) with smooth hover expansion.
- **Interactive 3D WebGL Mountain Terrain**: Low-poly wireframe mountain canvas built with Three.js featuring real-time mouse parallax tilt, RGB split chromatic aberration ridges, and dynamic vertex ripple displacement.
- **Expedition Authentication Portal**: Minimalist glassmorphic sign-in and registration experience with 1-click guest explorer access.
- **Collaborative Itinerary Workspace**: Drag-and-drop activity planning with `@dnd-kit`, interactive Leaflet maps, multi-collaborator presence, packing checklist, and UPI QR split hub.
- **Dual Export Studio**: 1-click export to formatted Excel spreadsheets (`.xlsx`) or aesthetic vintage postcard snapshots (`.png`).
- **Buttery-Smooth Scrolling**: Powered by Lenis smooth scroll engine.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4, Framer Motion
- **3D & Graphics**: Three.js (WebGL)
- **Smooth Scroll**: Lenis
- **Drag & Drop**: `@dnd-kit/core`, `@dnd-kit/sortable`
- **Exports**: `xlsx`, `html-to-image`, `downloadjs`
- **QR Codes & Confetti**: `qrcode.react`, `canvas-confetti`
- **Typography**: Cormorant Garamond, Geist Sans, Space Mono

---

## 🚀 Quick Start

```bash
# Navigate to tripmate project folder
cd tripmate

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 📂 Project Structure

```
tripmate/
├── src/
│   ├── app/
│   │   ├── page.tsx               # Main Editorial Landing Page
│   │   ├── dashboard/             # Bento Trip Hub
│   │   ├── trips/[id]/            # Collaborative Itinerary Canvas
│   │   ├── login/                 # 3D Mountain Auth Portal
│   │   └── register/              # Explorer Registration
│   ├── components/
│   │   ├── wanderlust/            # HeroViewfinder, PolaroidScatter, HowWeTravel
│   │   ├── spatial/               # MountainWireframeCanvas (Three.js WebGL)
│   │   ├── auth/                  # MountainAuthSection
│   │   ├── itinerary/             # ItineraryCanvas, InteractiveMap
│   │   ├── utilities/             # BudgetHub (UPI), PackingChecklist, TripNotes
│   │   ├── export/                # ExportModal (Excel & Postcard)
│   │   └── providers/             # SmoothScroll (Lenis)
│   ├── context/                   # TripContext (State management & local storage)
│   └── data/                      # Initial Indian itineraries & mock trips
└── public/                        # Static assets
```

---

## 📄 License

MIT License. Crafted with precision for high-end travel planning.
