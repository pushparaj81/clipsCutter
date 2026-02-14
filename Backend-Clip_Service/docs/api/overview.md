# API Overview

The Backend Clip Service provides a RESTful API for video clipping operations.

## Base URL

```
Development: http://localhost:8000
Production: https://api.your-domain.com
```

## Authentication

Currently, the API does not require authentication. For production use, implement:
- API Keys
- JWT tokens
- Rate limiting

## Content Type

All requests and responses use `application/json`.

## API Endpoints

### 1. Video Information

**Endpoint:** `POST /api/info`

Get metadata for a YouTube video.

**Request:**
```json
{
  "url": "https://youtube.com/watch?v=VIDEO_ID"
}
```

**Response:**
```json
{
  "videoId": "VIDEO_ID",
  "title": "Video Title",
  "thumbnail": "https://...",
  "duration": 300.5,
  "availableQualities": [
    {"label": "1080p", "height": 1080},
    {"label": "720p", "height": 720}
  ],
  "availableFormats": ["mp4", "mp3", "webm"]
}
```

[Full Documentation →](info.md)

---

### 2. Create Clip

**Endpoint:** `POST /api/clip`

Create a new video clip job.

**Request:**
```json
{
  "videoId": "VIDEO_ID",
  "startTime": 10.5,
  "endTime": 60.0,
  "format": "mp4",
  "quality": "720p",
  "title": "My Clip"
}
```

**Response:**
```json
{
  "status": "queued",
  "clipId": "uuid-here",
  "message": "Processing started"
}
```

[Full Documentation →](clip.md)

---

### 3. Check Status

**Endpoint:** `GET /api/status?id=CLIP_ID`

Check the processing status of a clip.

**Response:**
```json
{
  "id": "uuid-here",
  "videoId": "VIDEO_ID",
  "status": "PROCESSING",
  "progress": 45,
  "downloadUrl": null,
  "error": null,
  "fileSize": null,
  "createdAt": "2026-02-14T08:00:00Z"
}
```

[Full Documentation →](status.md)

---

## Status Values

| Status | Description |
|--------|-------------|
| `PENDING` | Job queued, waiting to start |
| `PROCESSING` | Currently downloading/processing |
| `COMPLETED` | Successfully completed |
| `FAILED` | Processing failed |

## Rate Limits

**Current:** No rate limiting (development)

**Recommended for Production:**
- 100 requests per minute per IP
- 10 concurrent clip jobs per user

## Error Responses

All errors follow this format:

```json
{
  "detail": "Error message here"
}
```

**Common HTTP Status Codes:**

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request - Invalid input |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |

[Error Handling Guide →](errors.md)

## Interactive Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Code Examples

### cURL

```bash
# Get video info
curl -X POST http://localhost:8000/api/info \
  -H "Content-Type: application/json" \
  -d '{"url": "https://youtube.com/watch?v=dQw4w9WgXcQ"}'

# Create clip
curl -X POST http://localhost:8000/api/clip \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "dQw4w9WgXcQ",
    "startTime": 0,
    "endTime": 30,
    "format": "mp4"
  }'

# Check status
curl http://localhost:8000/api/status?id=CLIP_ID
```

### Python

```python
import requests

# Get video info
response = requests.post(
    "http://localhost:8000/api/info",
    json={"url": "https://youtube.com/watch?v=dQw4w9WgXcQ"}
)
data = response.json()

# Create clip
response = requests.post(
    "http://localhost:8000/api/clip",
    json={
        "videoId": "dQw4w9WgXcQ",
        "startTime": 0,
        "endTime": 30,
        "format": "mp4"
    }
)
clip = response.json()

# Check status
response = requests.get(
    f"http://localhost:8000/api/status?id={clip['clipId']}"
)
status = response.json()
```

### JavaScript

```javascript
// Get video info
const infoResponse = await fetch('http://localhost:8000/api/info', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://youtube.com/watch?v=dQw4w9WgXcQ'
  })
})
const info = await infoResponse.json()

// Create clip
const clipResponse = await fetch('http://localhost:8000/api/clip', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    videoId: 'dQw4w9WgXcQ',
    startTime: 0,
    endTime: 30,
    format: 'mp4'
  })
})
const clip = await clipResponse.json()

// Check status
const statusResponse = await fetch(
  `http://localhost:8000/api/status?id=${clip.clipId}`
)
const status = await statusResponse.json()
```

## Webhooks (Future)

Planned feature for receiving notifications when clips complete:

```json
{
  "event": "clip.completed",
  "clipId": "uuid-here",
  "downloadUrl": "/temp/file.mp4",
  "timestamp": "2026-02-14T08:00:00Z"
}
```
