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

All AI routes return structured JSON responses, include 1-retry validation on output, and emit `503 Service Unavailable` (`{ "error": "Gemini not configured" }`) when `GEMINI_API_KEY` is not set. If AI validation fails after retry, routes return `502 Bad Gateway` (`{ "error": "AI could not produce a valid result, please try again" }`).

**Normalization & Coordinates:**
- All `startTime` and `endTime` fields are normalized to zero-padded 12-hour format (`"hh:mm AM/PM"`, e.g. `"09:00 AM"`, `"01:30 PM"`).
- Every returned item includes `"coordsVerified": boolean` (`true` means the place was matched by a geocoder within distance bounds, not guaranteed on-the-ground; `false` if geocoding was out of bounds or unmatched, with unverified coordinates snapped to the nearest verified item within 10 km when available).
- Geocoding queries are spatially biased with the destination (e.g. `"${locationName}, ${destination}"`).
- In `/api/ai/generate-draft`, the destination is geocoded first to establish the bounds centre (skipped if destination cannot be geocoded). In `/api/ai/suggest`, if the trip has no usable coordinates, it falls back to geocoding `trip.destination` (and skips bounds check if geocoding fails).
- `transitToNext` is omitted on the last item of each day. If `MAPBOX_TOKEN` is configured, transit is recomputed via Mapbox; otherwise `transitToNext` is omitted entirely.

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
- **Response (200 OK)**: `{ "days": [ { "dayNumber": 1, "title": "...", "items": [ { ..., "coordsVerified": true } ] } ] }`

#### `POST /api/ai/suggest-gap`
Suggests 2–3 waypoints to fill a specific time gap.
- **Auth**: Session Cookie
- **Role**: `OWNER` or `EDITOR` of `tripId`
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
- **Validations**: `dayId` must belong to `tripId` (returns `400 Bad Request` if invalid).
- **Response (200 OK)**: `{ "suggestions": [ { ..., "coordsVerified": true } ] }`

#### `POST /api/ai/suggest`
AI Copilot suggestion endpoint choosing the best day for a natural language prompt.
- **Auth**: Session Cookie
- **Role**: `OWNER` or `EDITOR` of `tripId`
- **Request Body**:
  ```json
  {
    "tripId": "goa-2026",
    "prompt": "Add a scenic sunset viewpoint before dinner",
    "dayId": "day-1" // Optional: constrain to specific day
  }
  ```
- **Validations**: `dayId` (if provided or chosen) must belong to `tripId` (returns `400 Bad Request` if invalid).
- **Response (200 OK)**: `{ "dayId": "day-1", "item": { ..., "coordsVerified": true } }`

#### `POST /api/ai/parse-trip`
Extracts structured travel parameters from unstructured user text and geocodes the destination.
- **Auth**: Session Cookie
- **Rate Limit**: 10 requests / min per user
- **Request Body**:
  ```json
  {
    "text": "Plan a 3-day beach trip to Goa starting 2026-11-20 with a budget of 30000 INR for 4 friends, relaxed vibe"
  }
  ```
- **Validations**: `text` max 500 characters, min 1 character (returns `400 Bad Request` if invalid).
- **Data Protection**: User input text is treated strictly as data, never system instructions. Missing parameters are returned as `null` without guessing.
- **Response (200 OK)**:
  ```json
  {
    "destination": "Goa",
    "days": 3,
    "budget": 30000,
    "travelers": 4,
    "vibe": "Relaxed",
    "startDate": "2026-11-20",
    "stateOrRegion": "Goa, India",
    "lat": 15.2993,
    "lng": 74.1240
  }
  ```

#### `POST /api/ai/tagline`
Generates a short, poetic trip tagline (maximum 8 words, no emojis).
- **Auth**: Session Cookie
- **Role**: `OWNER`, `EDITOR`, or `VIEWER` (members only; returns `403 Forbidden` for non-members)
- **Request Body**:
  ```json
  {
    "tripId": "goa-2026"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "tagline": "Golden tides, cliffside laughter and ocean sunsets"
  }
  ```

#### `POST /api/ai/generate-draft-stream`
Streams multi-day draft generation as newline-delimited JSON (`application/x-ndjson`), emitting an outline followed by days as they complete (max 2 parallel Gemini calls).
- **Auth**: Session Cookie
- **Rate Limit**: 5 requests / min per user
- **Execution Limit**: `maxDuration = 120` seconds
- **Request Body**:
  ```json
  {
    "destination": "Goa",
    "days": 2,
    "budget": 15000,
    "vibe": "Beach & Chill"
  }
  ```
- **Stream Sequence**:
  1. `{"type":"outline","days":[{"dayNumber":1,"title":"..."}]}`
  2. `{"type":"day","day":{"dayNumber":1,"title":"...","items":[...]}}`
  3. `{"type":"day","day":{"dayNumber":2,"title":"...","items":[...]}}`
  4. `{"type":"done"}`
  *(If one day fails, emits `{"type":"error","dayNumber":N}` and continues with remaining days)*

---

### 4. Trip CRUD & Utility Routes

- `GET /api/trips`: List user trips.
- `POST /api/trips`: Create trip (auto-fetches Unsplash cover if `coverImage` omitted).
- `GET /api/trips/[id]`: Full trip bundle.
- `PUT /api/trips/[id]`: Update trip header (`OWNER` only).
- `DELETE /api/trips/[id]`: Delete trip (`OWNER` only).
- `POST /api/trips/[id]/invite`: Generate invite link (`OWNER` only).
- `POST /api/join`: Join trip with invite token.
- `POST /api/trips/[id]/import-draft`: Batch import AI-generated draft days/items into trip (`OWNER`/`EDITOR` only). Matches by `dayNumber`, sets titles, appends items with ordered indices, strips `coordsVerified`, recalculates transit best-effort in one atomic `$transaction`, and returns `{ trip }`.
- `POST /api/trips/[id]/ai/chat`: Interactive itinerary co-pilot chat (`OWNER`/`EDITOR` only, rate limited, last 10 messages max 1000 chars each). Receives full itinerary context server-side. Gemini returns `{ reply, proposal }` via structured output without modifying the database. Drops invalid changes and geocodes/normalizes "add" items.
- `POST /api/trips/[id]/ai/apply`: Atomic execution of approved proposal changes (`OWNER`/`EDITOR` only). Validates all `dayId` and `itemId` against the trip, applies all changes in a single `prisma.$transaction`, renumbers `orderIndex` contiguously (`0..n-1`), recalculates transit for affected days, and returns the full serialized trip.
- `POST /api/trips/[id]/days/[dayId]/optimize`: Intelligently reorders day itinerary to minimize travel time (`OWNER`/`EDITOR` only). Requires at least 3 items with real coordinates. Preserves fixed anchors (`FOOD`, `LODGING`, `TRANSIT`) while permuting free items among free time slots. Uses Mapbox/Haversine transit matrix. Returns `{ proposal, beforeMinutes, afterMinutes, explanation }` with a 2-sentence Gemini explanation. Does not write to the database.
- `POST /api/trips/[id]/days/[dayId]/items`: Add item (`OWNER`/`EDITOR`).
- `PUT /api/trips/[id]/items/[itemId]`: Edit item (`OWNER`/`EDITOR`).
- `DELETE /api/trips/[id]/items/[itemId]`: Delete item (`OWNER`/`EDITOR`).
- `PUT /api/trips/[id]/items/reorder`: Atomic multi-item or cross-day reordering (`OWNER`/`EDITOR`).
- `POST /api/trips/[id]/days/[dayId]/recalculate-transit`: Recalculate transit durations/distances (`OWNER`/`EDITOR`).
- `POST / PATCH / DELETE /api/trips/[id]/checklist/...`: Manage packing checklist.
- `POST / DELETE /api/trips/[id]/expenses/...`: Manage trip expenses.
- `POST / DELETE /api/trips/[id]/notes/...`: Manage corkboard notes.

---

### 5. AI Co-Pilot Proposal Schema (`src/lib/proposal.ts`)

Proposals are strictly validated with Zod:
```ts
{
  summary: string;
  changes: Change[]; // Max 20 changes
}
```
Where `Change` is one of:
- **`add`**: `{ type: "add", dayId: string, item: { title, category, startTime, endTime, estimatedCost, lat, lng, locationName, notes?, bookingRef? }, orderIndex?: number }`
- **`move`**: `{ type: "move", itemId: string, toDayId: string, orderIndex: number }`
- **`update`**: `{ type: "update", itemId: string, fields: { title?, category?, startTime?, endTime?, estimatedCost?, lat?, lng?, locationName?, notes?, bookingRef? } }`
- **`delete`**: `{ type: "delete", itemId: string }`

