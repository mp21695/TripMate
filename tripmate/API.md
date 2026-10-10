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
- **Session Tokens** (`purpose: "session"`): Issued on `/api/auth/login` & `/api/auth/register`. Required for accessing application routes and `/api/auth/me`.
- **Invite Tokens** (`purpose: "invite"`): Issued on `/api/trips/[id]/invite`. Only valid for `/api/join`.

### Role-Based Access Control (RBAC)
Trip member access levels:
- **`OWNER`**: Full permissions (Create/Read/Update/Delete trip, manage members, generate invite links, edit itinerary/utilities).
- **`EDITOR`**: Read/Write access (Create/Edit/Delete itinerary items, reorder items across days, add/edit/delete checklist items, expenses, and notes). Cannot edit trip header, invite members, or delete the trip.
- **`VIEWER`**: Read-only access to trip workspace and modules.

---

## Endpoints Summary

### 1. Authentication Routes

#### `POST /api/auth/register`
Creates a new explorer account and sets the session cookie.
- **Auth**: None
- **Request Body**:
  ```json
  {
    "fullName": "Kabir Sharma",
    "email": "kabir@tripmate.dev",
    "password": "demo1234",
    "style": "Himalayan High Passes"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "user": {
      "id": "usr-uuid",
      "email": "kabir@tripmate.dev",
      "name": "Kabir Sharma",
      "avatar": null,
      "upiId": null,
      "travelStyle": "Himalayan High Passes",
      "createdAt": "2026-10-10T12:00:00.000Z"
    }
  }
  ```
- **Errors**: `400` (Validation error), `409` (Email already registered).

#### `POST /api/auth/login`
Authenticates existing credentials and sets session cookie.
- **Auth**: None
- **Request Body**:
  ```json
  {
    "email": "kabir@tripmate.dev",
    "password": "demo1234"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "user": {
      "id": "usr-uuid",
      "email": "kabir@tripmate.dev",
      "name": "Kabir (You)"
    }
  }
  ```
- **Errors**: `401` (`"Invalid credentials"`).

#### `POST /api/auth/logout`
Clears session cookie.
- **Auth**: Session cookie
- **Response (200 OK)**:
  ```json
  { "message": "Logged out successfully" }
  ```

#### `GET /api/auth/me`
Retrieves currently logged in user profile.
- **Auth**: Session cookie (`purpose: "session"`)
- **Response (200 OK)**:
  ```json
  { "user": { "id": "usr-uuid", "email": "kabir@tripmate.dev", "name": "Kabir (You)" } }
  ```
- **Errors**: `401` (`"Unauthenticated"`).

---

### 2. Trip Routes

#### `GET /api/trips`
Lists all trips the logged-in user belongs to.
- **Auth**: Session Cookie
- **Response (200 OK)**:
  ```json
  {
    "trips": [ /* Array of full Trip objects in frontend shape */ ]
  }
  ```

#### `POST /api/trips`
Creates a new trip, assigns creator as `OWNER`, and auto-generates 1 `Day` per date in range.
- **Auth**: Session Cookie
- **Request Body**:
  ```json
  {
    "title": "Kerala Backwaters & Hills",
    "destination": "Munnar & Alleppey",
    "stateOrRegion": "Kerala, India",
    "startDate": "2026-12-01",
    "endDate": "2026-12-03",
    "totalBudget": 35000,
    "currency": "INR",
    "lat": 9.9312,
    "lng": 76.2673,
    "coverImage": "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "trip": {
      "id": "trip-uuid",
      "title": "Kerala Backwaters & Hills",
      "days": [
        { "id": "day-1", "dayNumber": 1, "date": "2026-12-01", "title": "Day 1", "items": [] },
        { "id": "day-2", "dayNumber": 2, "date": "2026-12-02", "title": "Day 2", "items": [] },
        { "id": "day-3", "dayNumber": 3, "date": "2026-12-03", "title": "Day 3", "items": [] }
      ]
    }
  }
  ```
- **Errors**: `400` (`endDate cannot be before startDate`).

#### `GET /api/trips/[id]`
Retrieves full trip bundle.
- **Auth**: Session Cookie
- **Role**: `OWNER`, `EDITOR`, or `VIEWER`
- **Response (200 OK)**: `{ "trip": { ... } }`
- **Errors**: `403` (Not a member), `404` (Trip not found).

#### `PUT /api/trips/[id]`
Updates trip metadata.
- **Auth**: Session Cookie
- **Role**: `OWNER` only
- **Request Body**: `{ "title": "Updated Title", "totalBudget": 50000 }`
- **Response (200 OK)**: `{ "trip": { ... } }`

#### `DELETE /api/trips/[id]`
Deletes a trip and cascades delete to all items, days, checklist, expenses, and notes.
- **Auth**: Session Cookie
- **Role**: `OWNER` only
- **Response (200 OK)**: `{ "message": "Trip deleted successfully" }`

---

### 3. Invites & Joining

#### `POST /api/trips/[id]/invite`
Generates a signed invite token URL.
- **Auth**: Session Cookie
- **Role**: `OWNER` only
- **Request Body**: `{ "role": "EDITOR" }` (or `"VIEWER"`)
- **Response (200 OK)**: `{ "link": "/join?token=eyJhbG..." }`

#### `POST /api/join`
Accepts an invite token and joins the trip.
- **Auth**: Session Cookie
- **Request Body**: `{ "token": "eyJhbG..." }`
- **Response (200 OK)**: `{ "message": "Joined trip successfully", "tripId": "goa-2026", "role": "EDITOR" }`
- **Errors**: `400` (`"Invalid or expired invite token"`).

---

### 4. Itinerary Routes

#### `POST /api/trips/[id]/days/[dayId]/items`
Creates a new itinerary waypoint.
- **Auth**: Session Cookie
- **Role**: `OWNER` or `EDITOR`
- **Request Body**:
  ```json
  {
    "title": "Sunset Kayaking",
    "category": "ATTRACTION",
    "startTime": "05:00 PM",
    "endTime": "06:30 PM",
    "estimatedCost": 1500,
    "lat": 15.0100,
    "lng": 74.0232,
    "locationName": "Palolem Beach",
    "transitToNext": { "mode": "SCOOTER", "durationMinutes": 15, "distanceKm": 4.5 }
  }
  ```
- **Response (201 Created)**: `{ "item": { ... } }`

#### `PUT /api/trips/[id]/items/[itemId]`
Updates an itinerary waypoint.
- **Auth**: Session Cookie
- **Role**: `OWNER` or `EDITOR`
- **Response (200 OK)**: `{ "item": { ... } }`

#### `DELETE /api/trips/[id]/items/[itemId]`
Deletes an itinerary waypoint.
- **Auth**: Session Cookie
- **Role**: `OWNER` or `EDITOR`
- **Response (200 OK)**: `{ "message": "Item deleted successfully" }`

#### `PUT /api/trips/[id]/items/reorder`
Reorders itinerary items within a day or moves items across different days atomically.
- **Auth**: Session Cookie
- **Role**: `OWNER` or `EDITOR`
- **Request Body**:
  ```json
  {
    "moves": [
      { "itemId": "item-1", "dayId": "day-2", "orderIndex": 0 },
      { "itemId": "item-2", "dayId": "day-1", "orderIndex": 1 }
    ]
  }
  ```
- **Response (200 OK)**: `{ "message": "Reordered items successfully" }`
- **Errors**: `400` if any item/day in `moves` does not belong to `tripId` (rollback guaranteed).

---

### 5. Utility Routes (Checklist, Expenses, Notes)

#### `POST /api/trips/[id]/checklist`
- **Role**: `OWNER` or `EDITOR`
- **Body**: `{ "text": "Driving License", "category": "DOCUMENTS", "priority": "HIGH", "assignedToId": "usr-id" }`
- **Response (201 Created)**: `{ "item": { ... } }`

#### `PATCH /api/trips/[id]/checklist/[checkId]`
- **Role**: `OWNER` or `EDITOR`
- **Body**: `{ "isCompleted": true }`
- **Response (200 OK)**: `{ "item": { ... } }`

#### `DELETE /api/trips/[id]/checklist/[checkId]`
- **Role**: `OWNER` or `EDITOR`
- **Response (200 OK)**: `{ "message": "Checklist item deleted successfully" }`

#### `POST /api/trips/[id]/expenses`
- **Role**: `OWNER` or `EDITOR`
- **Body**: `{ "title": "Villa Booking", "amount": 16500, "category": "STAY", "date": "2026-11-01", "paidById": "usr-id" }`
- **Response (201 Created)**: `{ "expense": { ... } }`

#### `DELETE /api/trips/[id]/expenses/[expenseId]`
- **Role**: `OWNER` or `EDITOR`
- **Response (200 OK)**: `{ "message": "Expense deleted successfully" }`

#### `POST /api/trips/[id]/notes`
- **Role**: `OWNER` or `EDITOR`
- **Body**: `{ "text": "Keep cash for ATMs!", "color": "yellow", "authorId": "usr-id" }`
- **Response (201 Created)**: `{ "note": { ... } }`

#### `DELETE /api/trips/[id]/notes/[noteId]`
- **Role**: `OWNER` or `EDITOR`
- **Response (200 OK)**: `{ "message": "Note deleted successfully" }`
