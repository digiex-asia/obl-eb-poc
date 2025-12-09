# API Contract Documentation

## Overview

This document defines the complete API contract for the Command Pattern implementation with legacy adapter support. All endpoints follow REST conventions and return JSON.

## Base URL

```
Development: http://localhost:3000/api/v1
Production: https://api.yourdomain.com/api/v1
```

## Authentication

All endpoints require authentication via Bearer token:

```http
Authorization: Bearer <jwt_token>
```

---

## Endpoints

### GET /templates/:id

Retrieve a template by ID. Always returns DesignData format regardless of storage format.

#### Request

```http
GET /api/v1/templates/3ea81e638f01468da5f46ed4670c724b HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Success Response (200 OK)

```json
{
  "id": "3ea81e638f01468da5f46ed4670c724b",
  "name": "Header1234",
  "description": "Email header template",
  "designData": {
    "canvas": {
      "width": 1200,
      "height": 1400
    },
    "pages": [
      {
        "id": "3ea81e638f01468da5f46ed4670c724b",
        "duration": 5,
        "background": "#361E1E",
        "elements": [
          {
            "id": "9d014b58-ed74-4c43-bece-95cd7ce31d25",
            "type": "polygon",
            "className": "graphicShape",
            "x": 73,
            "y": 1079,
            "width": 208,
            "height": 275,
            "rotation": 0,
            "opacity": 1,
            "fill": "#D0D0D0",
            "animation": {
              "type": "neon",
              "speed": 0.3,
              "delay": 0.4,
              "direction": "up",
              "mode": "enter"
            }
          }
        ],
        "animation": {
          "type": "fade",
          "speed": 0.3,
          "delay": 0,
          "direction": "up",
          "mode": "enter"
        }
      }
    ],
    "audioLayers": []
  },
  "version": 1,
  "sourceFormat": "v1",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-20T14:45:00Z"
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique template identifier |
| `name` | string | Template display name |
| `description` | string? | Optional description |
| `designData` | DesignData | Template content in v2 format |
| `designData.canvas` | Object | Canvas dimensions |
| `designData.pages` | Page[] | Array of pages (single page for legacy) |
| `designData.audioLayers` | AudioLayer[] | Audio tracks (empty for legacy) |
| `version` | number | Optimistic concurrency version |
| `sourceFormat` | 'v1' \| 'v2' | Storage format (informational) |
| `createdAt` | string | ISO 8601 timestamp |
| `updatedAt` | string | ISO 8601 timestamp |

#### Error Responses

**404 Not Found**
```json
{
  "error": "Template not found",
  "code": "TEMPLATE_NOT_FOUND",
  "templateId": "3ea81e638f01468da5f46ed4670c724b"
}
```

**403 Forbidden**
```json
{
  "error": "Access denied",
  "code": "FORBIDDEN",
  "message": "You do not have permission to view this template"
}
```

**400 Bad Request**
```json
{
  "error": "Unknown template format",
  "code": "INVALID_FORMAT",
  "details": "Template structure does not match v1 or v2"
}
```

---

### POST /templates/:id/operations

Apply batch operations to a template. Works with both legacy and v2 formats.

#### Request

```http
POST /api/v1/templates/3ea81e638f01468da5f46ed4670c724b/operations HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "operations": [
    {
      "id": "op-abc123xyz",
      "type": "move_element",
      "target": {
        "pageId": "3ea81e638f01468da5f46ed4670c724b",
        "elementId": "9d014b58-ed74-4c43-bece-95cd7ce31d25"
      },
      "payload": {
        "x": 150,
        "y": 200
      },
      "timestamp": 1705843200000
    },
    {
      "id": "op-def456uvw",
      "type": "resize_element",
      "target": {
        "pageId": "3ea81e638f01468da5f46ed4670c724b",
        "elementId": "9d014b58-ed74-4c43-bece-95cd7ce31d25"
      },
      "payload": {
        "x": 150,
        "y": 200,
        "width": 250,
        "height": 300
      },
      "timestamp": 1705843201000
    }
  ],
  "baseVersion": 1,
  "clientId": "client-frontend-session-xyz",
  "sessionSequence": 42
}
```

#### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `operations` | Operation[] | Yes | Array of operations to apply |
| `operations[].id` | string | Yes | Unique operation ID (for idempotency) |
| `operations[].type` | OperationType | Yes | Operation type |
| `operations[].target` | OperationTarget | Yes | Target entity (page, element, etc.) |
| `operations[].payload` | object | Yes | Operation-specific data |
| `operations[].timestamp` | number | Yes | Client timestamp (ms since epoch) |
| `baseVersion` | number | Yes | Expected template version |
| `clientId` | string | No | Client session ID (for telemetry) |
| `sessionSequence` | number | No | Per-session operation sequence |

#### Operation Types

| Type | Description | Payload |
|------|-------------|---------|
| `add_element` | Add new element to page | `{ type, x, y, width, height, fill, ... }` |
| `move_element` | Move element position | `{ x, y }` |
| `resize_element` | Resize element | `{ x, y, width, height }` |
| `rotate_element` | Rotate element | `{ rotation }` (degrees) |
| `delete_element` | Delete element | `{}` (empty) |
| `update_element_props` | Update element properties | `{ fill?, opacity?, text?, ... }` |
| `add_page` | Add new page (v2 only) | `{ duration, background }` |
| `update_page` | Update page properties | `{ duration?, background?, ... }` |
| `delete_page` | Delete page (v2 only) | `{}` |
| `add_audio_clip` | Add audio clip (v2 only) | `{ src, label, startAt, duration }` |
| `delete_audio_clip` | Delete audio clip (v2 only) | `{}` |

#### Success Response (200 OK)

```json
{
  "template": {
    "id": "3ea81e638f01468da5f46ed4670c724b",
    "name": "Header1234",
    "designData": {
      "canvas": { "width": 1200, "height": 1400 },
      "pages": [ /* updated pages */ ],
      "audioLayers": []
    },
    "version": 2,
    "sourceFormat": "v1"
  },
  "appliedOps": [
    "op-abc123xyz",
    "op-def456uvw"
  ],
  "newVersion": 2,
  "serverTimestamp": 1705843205000
}
```

#### Conflict Response (409 Conflict)

```json
{
  "error": "VERSION_CONFLICT",
  "message": "Template was modified by another user",
  "currentVersion": 3,
  "requestedVersion": 1,
  "serverState": {
    "canvas": { "width": 1200, "height": 1400 },
    "pages": [ /* current server pages */ ],
    "audioLayers": []
  },
  "serverOperations": [
    {
      "id": "op-server1",
      "type": "move_element",
      "target": { "elementId": "9d014b58-ed74-4c43-bece-95cd7ce31d25" },
      "payload": { "x": 200, "y": 300 },
      "timestamp": 1705843202000
    }
  ],
  "conflictingOps": [
    "op-abc123xyz"
  ],
  "suggestedResolution": "server-wins",
  "resolutionOptions": {
    "autoMerge": {
      "available": false,
      "reason": "Conflicting modifications to same element"
    },
    "strategies": [
      {
        "strategy": "client-wins",
        "description": "Keep your changes",
        "warning": "Server changes will be overwritten"
      },
      {
        "strategy": "server-wins",
        "description": "Use server version",
        "warning": "Your changes will be lost"
      },
      {
        "strategy": "manual",
        "description": "Resolve conflicts manually"
      }
    ]
  }
}
```

#### Error Responses

**400 Bad Request - Invalid Operation**
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "errors": [
    {
      "operationId": "op-abc123xyz",
      "code": "TARGET_NOT_FOUND",
      "message": "Element 9d014b58-ed74-4c43-bece-95cd7ce31d25 not found in page",
      "field": "target.elementId"
    }
  ]
}
```

**409 Conflict - Version Mismatch**
(See above for full conflict response)

**422 Unprocessable Entity - Business Rule Violation**
```json
{
  "error": "Business rule violation",
  "code": "BUSINESS_RULE_VIOLATION",
  "operationId": "op-delete-page-1",
  "message": "Cannot delete the last page",
  "rule": "MIN_PAGES"
}
```

---

### GET /templates/:id/operations

Retrieve operation history for a template.

#### Request

```http
GET /api/v1/templates/3ea81e638f01468da5f46ed4670c724b/operations?fromVersion=1&toVersion=10&limit=50 HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `fromVersion` | number | No | 0 | Start version (inclusive) |
| `toVersion` | number | No | current | End version (inclusive) |
| `limit` | number | No | 100 | Max operations to return |
| `offset` | number | No | 0 | Skip N operations |
| `includePayload` | boolean | No | true | Include operation payloads |

#### Success Response (200 OK)

```json
{
  "operations": [
    {
      "id": "op-1",
      "type": "add_element",
      "target": {
        "pageId": "page-1",
        "elementId": "el-1"
      },
      "payload": {
        "type": "rect",
        "x": 100,
        "y": 100,
        "width": 50,
        "height": 50,
        "fill": "#ff0000"
      },
      "baseVersion": 0,
      "resultingVersion": 1,
      "userId": "user-123",
      "clientId": "client-xyz",
      "sessionSequence": 1,
      "clientTimestamp": 1705843200000,
      "serverTimestamp": "2024-01-21T12:00:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "fromVersion": 1,
    "toVersion": 10,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

---

### GET /templates/:id/snapshot/:version

Retrieve template state at a specific version (time-travel).

#### Request

```http
GET /api/v1/templates/3ea81e638f01468da5f46ed4670c724b/snapshot/5 HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Success Response (200 OK)

```json
{
  "template": {
    "id": "3ea81e638f01468da5f46ed4670c724b",
    "name": "Header1234",
    "designData": { /* state at version 5 */ },
    "version": 5
  },
  "createdAt": "2024-01-21T12:05:00Z",
  "source": "snapshot"
}
```

---

### POST /templates/:id/revert

Revert template to a previous version.

#### Request

```http
POST /api/v1/templates/3ea81e638f01468da5f46ed4670c724b/revert HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "targetVersion": 5,
  "reason": "Undo accidental deletion"
}
```

#### Success Response (200 OK)

```json
{
  "template": {
    "id": "3ea81e638f01468da5f46ed4670c724b",
    "designData": { /* reverted state */ },
    "version": 11
  },
  "revertedFrom": 10,
  "revertedTo": 5,
  "operationsRolledBack": 5
}
```

---

### POST /templates/:id/resolve-conflict

Resolve a version conflict with chosen strategy.

#### Request

```http
POST /api/v1/templates/3ea81e638f01468da5f46ed4670c724b/resolve-conflict HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "resolution": "client-wins",
  "clientOperations": [
    {
      "id": "op-abc123xyz",
      "type": "move_element",
      "target": { "elementId": "el-1" },
      "payload": { "x": 150, "y": 200 },
      "timestamp": 1705843200000
    }
  ],
  "baseVersion": 1
}
```

#### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `resolution` | string | Yes | 'client-wins', 'server-wins', or 'manual' |
| `clientOperations` | Operation[] | If client-wins | Operations to force apply |
| `manualState` | DesignData | If manual | Manually merged state |
| `baseVersion` | number | Yes | Original base version |

#### Success Response (200 OK)

```json
{
  "template": {
    "id": "3ea81e638f01468da5f46ed4670c724b",
    "designData": { /* resolved state */ },
    "version": 4
  },
  "newVersion": 4,
  "resolvedAt": "2024-01-21T12:10:00Z",
  "resolution": "client-wins"
}
```

---

## TypeScript Types

### DesignData

```typescript
interface DesignData {
  canvas: {
    width: number;
    height: number;
  };
  pages: Page[];
  audioLayers: AudioLayer[];
}

interface Page {
  id: string;
  duration: number;           // seconds
  background: string;         // hex color
  elements: DesignElement[];
  animation?: AnimationSettings;
}

interface DesignElement {
  id: string;
  type: ElementType;
  className?: string;         // For Konva compatibility
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;           // degrees (0-360)
  fill: string;               // hex color
  opacity: number;            // 0.0 to 1.0
  text?: string;
  fontSize?: number;
  src?: string;               // For image elements
  animation?: AnimationSettings;
}

type ElementType =
  | 'rect'
  | 'circle'
  | 'triangle'
  | 'star'
  | 'polygon'
  | 'heart'
  | 'diamond'
  | 'image'
  | 'text';

interface AnimationSettings {
  type: string;               // 'fade', 'rise', 'punch', 'neon', etc.
  speed: number;              // seconds
  delay: number;              // seconds
  direction: 'up' | 'down' | 'left' | 'right';
  mode: 'enter' | 'exit' | 'both';
}

interface AudioLayer {
  id: string;
  clips: AudioClip[];
}

interface AudioClip {
  id: string;
  src: string;                // Audio file URL
  label: string;
  startAt: number;            // seconds into timeline
  duration: number;           // seconds
  offset: number;             // seconds into source file
  totalDuration: number;      // total source file duration
}
```

### Operation

```typescript
interface Operation {
  id: string;
  type: OperationType;
  target: OperationTarget;
  payload: any;
  timestamp: number;          // ms since epoch
  userId?: string;
}

type OperationType =
  | 'add_element'
  | 'update_element'
  | 'delete_element'
  | 'move_element'
  | 'resize_element'
  | 'rotate_element'
  | 'update_element_props'
  | 'add_page'
  | 'update_page'
  | 'delete_page'
  | 'reorder_pages'
  | 'add_audio_clip'
  | 'update_audio_clip'
  | 'delete_audio_clip';

interface OperationTarget {
  pageId?: string;
  elementId?: string;
  audioLayerId?: string;
  clipId?: string;
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `TEMPLATE_NOT_FOUND` | 404 | Template does not exist |
| `FORBIDDEN` | 403 | User lacks permission |
| `INVALID_FORMAT` | 400 | Template structure invalid |
| `VALIDATION_ERROR` | 400 | Operation validation failed |
| `TARGET_NOT_FOUND` | 400 | Operation target doesn't exist |
| `INVALID_PAYLOAD` | 400 | Operation payload invalid |
| `BUSINESS_RULE_VIOLATION` | 422 | Business rule violated |
| `VERSION_CONFLICT` | 409 | Optimistic lock conflict |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limiting

All endpoints are rate-limited:

```
100 requests per minute per user
1000 operations per minute per template
```

Rate limit headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705843260
```

---

## Versioning

API uses URL versioning: `/api/v1/...`

Breaking changes will increment version: `/api/v2/...`

Legacy endpoints will be supported for 12 months after deprecation.

---

## Examples

### Complete Flow: Load, Edit, Save

```typescript
// 1. Load template
const response = await fetch('/api/v1/templates/abc123');
const { designData, version, sourceFormat } = await response.json();

console.log('Loaded template from', sourceFormat); // 'v1' or 'v2'

// 2. User edits (generates operations)
const operations = [
  {
    id: nanoid(),
    type: 'move_element',
    target: { pageId: designData.pages[0].id, elementId: 'el-1' },
    payload: { x: 150, y: 200 },
    timestamp: Date.now(),
  },
];

// 3. Save changes
const saveResponse = await fetch('/api/v1/templates/abc123/operations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    operations,
    baseVersion: version,
  }),
});

if (saveResponse.status === 409) {
  // Handle conflict
  const conflict = await saveResponse.json();
  // Show conflict resolution UI...
} else {
  const { newVersion } = await saveResponse.json();
  console.log('Saved successfully, new version:', newVersion);
}
```

### Handle Conflict

```typescript
const conflictResponse = await saveResponse.json();

// Option 1: Server wins (reload)
if (userChooses('server-wins')) {
  window.location.reload();
}

// Option 2: Client wins (force push)
if (userChooses('client-wins')) {
  await fetch('/api/v1/templates/abc123/resolve-conflict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resolution: 'client-wins',
      clientOperations: operations,
      baseVersion: conflictResponse.currentVersion,
    }),
  });
}
```
