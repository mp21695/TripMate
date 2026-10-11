# TripMate Backend API Documentation

This document provides complete technical specifications for all TripMate backend REST API endpoints.

---

## Base URL
```
http://localhost:3000/api
```

---

## Authentication & Authorization

All authenticated endpoints use JWT tokens stored in an `httpOnly`, `sameSite=lax` cookie named `tripmate_token` (or passed via `Authorization: Bearer <token>` header).

### JWT Token Claims & Purpose Scopes
- **Session Tokens** (`purpose: "session"`): Issued on `/api/auth/login` & `/api/auth/register`. Required for accessing application routes, `/api/auth/me`, and external services.
- **Invite Tokens** (`purpose: "invite"`): Issued on `/api/trips/[id]/invite`. Only valid for `/api/join`.

### Role-Based Access Control (RBAC)
Trip member access levels:
- **`OWNER`**: Full permissions (Create/Read/Update/Delete trip, manage members, generate invite links, edit itinerary/utilities).
- **`EDITOR`**: Read/Write access (Create/Edit/Delete itinerary items, reorder items across days, recalculate transit, add/edit/delete checklist items, expenses, and notes).
- **`VIEWER`**: Read-only access to trip workspace and modules.

---

## Endpoints Summary

### 1. Authentication Routes

#### `POST /api/auth/register`
Creates a new explorer account and sets the session cookie.
- **Auth**: None
- **Request Body**: `{ "fullName": "Kabir", "email": "kabir@tripmate.dev", "password": "demo1234", "style": "Explorer" }`
- **Response (201 Created)**: `{ "user": { "id": "...", "email": "...", "name": "..." } }`

#### `POST /api/auth/login`
Authenticates existing credentials and sets session cookie.
- **Auth**: None
- **Request Body**: `{ "email": "kabir@tripmate.dev", "password": "demo1234" }`
- **Response (200 OK)**: `{ "user": { ... } }`

#### `POST /api/auth/logout`
Clears session cookie.
- **Auth**: Session cookie
- **Response (200 OK)**: `{ "message": "Logged out successfully" }`

#### `GET /api/auth/me`
Retrieves currently logged in user profile.
- **Auth**: Session cookie (`purpose: "session"`)
- **Response (200 OK)**: `{ "user": { ... } }`

---

### 2. External Integration Routes (Places, Transit, Cover Images)

#### `GET /api/places/search?q=...`
Search for locations using Google Places API (New) with OpenStreetMap Nominatim fallback.
- **Auth**: Session Cookie
- **Rate Limit**: 20 requests / min per user
- **Cache**: 10 minutes TTL
- **Response (200 OK)**:
  ```json
  {
    "places": [
      {
        "id": "gplace-123",
        "name": "Artjuna Cafe",
        "address": "Anjuna Coastal Road, Goa",
        "lat": 15.5802,
        "lng": 73.7438,
        "rating": 4.6,
        "photoUrl": "/api/places/photo-proxy?name=places%2F...%2Fphotos%2F..."
      }
    ]
  }
  ```

#### `GET /api/places/photo-proxy?name=...`
Proxies Google Places photo media requests without exposing API keys to the browser.
- **Auth**: None (Streamed response)
- **Response**: Binary image stream (`image/jpeg`) with 24-hour cache headers.

#### `POST /api/transit`
Computes transit time & distance using Mapbox Directions API (with straight-line Haversine fallback for `FLIGHT`/`TRAIN` or missing tokens).
- **Auth**: Session Cookie
- **Request Body**:
  ```json
  {
    "from": { "lat": 15.6268, "lng": 73.8441 },
    "to": { "lat": 15.5802, "lng": 73.7438 },
    "mode": "SCOOTER"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "mode": "SCOOTER",
    "durationMinutes": 25,
    "distanceKm": 14.2
  }
  ```

#### `POST /api/trips/[id]/days/[dayId]/recalculate-transit`
Recalculates ordered transit buffers for all waypoints in a day.
- **Auth**: Session Cookie
- **Role**: `OWNER` or `EDITOR`
- **Response (200 OK)**: `{ "day": { ... } }`

---

### 3. Gemini AI Intelligence Routes

All AI routes return structured JSON responses, include 1-retry validation on output, and emit `503 Service Unavailable` (`{ "error": "Gemini not configured" }`) when `GEMINI_API_KEY` is not set.

#### `POST /api/ai/generate-draft`
Generates a complete multi-day itinerary draft.
- **Auth**: Session Cookie
- **Request Body**:
  ```json
  {
    "destination": "Goa",
    "days": 3,
    "budget": 45000,
    "vibe": "Coastal & Chill"
  }
  ```
- **Response (200 OK)**: `{ "days": [ ... ] }`

#### `POST /api/ai/suggest-gap`
Suggests 2–3 waypoints to fill a specific time gap.
- **Auth**: Session Cookie
- **Role**: `OWNER`, `EDITOR`, or `VIEWER` of `tripId`
- **Request Body**:
  ```json
  {
    "tripId": "goa-2026",
    "dayId": "day-1",
    "windowStart": "02:00 PM",
    "windowEnd": "04:30 PM",
    "nearLat": 15.5802,
    "nearLng": 73.7438
  }
  ```
- **Response (200 OK)**: `{ "suggestions": [ ... ] }`

#### `POST /api/ai/suggest`
AI Copilot suggestion endpoint choosing the best day for a natural language prompt.
- **Auth**: Session Cookie
- **Role**: `OWNER`, `EDITOR`, or `VIEWER` of `tripId`
- **Request Body**:
  ```json
  {
    "tripId": "goa-2026",
    "prompt": "Add a scenic sunset viewpoint before dinner"
  }
  ```
- **Response (200 OK)**: `{ "dayId": "day-1", "item": { ... } }`

---

### 4. Trip CRUD & Utility Routes

- `GET /api/trips`: List user trips.
- `POST /api/trips`: Create trip (auto-fetches Unsplash cover if `coverImage` omitted).
- `GET /api/trips/[id]`: Full trip bundle.
- `PUT /api/trips/[id]`: Update trip header (`OWNER` only).
- `DELETE /api/trips/[id]`: Delete trip (`OWNER` only).
- `POST /api/trips/[id]/invite`: Generate invite link (`OWNER` only).
- `POST /api/join`: Join trip with invite token.
- `POST /api/trips/[id]/days/[dayId]/items`: Add item (`OWNER`/`EDITOR`).
- `PUT /api/trips/[id]/items/[itemId]`: Edit item (`OWNER`/`EDITOR`).
- `DELETE /api/trips/[id]/items/[itemId]`: Delete item (`OWNER`/`EDITOR`).
- `PUT /api/trips/[id]/items/reorder`: Atomic multi-item or cross-day reordering (`OWNER`/`EDITOR`).
- `POST / PATCH / DELETE /api/trips/[id]/checklist/...`: Manage packing checklist.
- `POST / DELETE /api/trips/[id]/expenses/...`: Manage trip expenses.
- `POST / DELETE /api/trips/[id]/notes/...`: Manage corkboard notes.
