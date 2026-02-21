# ClipsCutter System Architecture & Workflow Guide

## High-Level System Overview

ClipsCutter is a distributed application that separates the user-interface (Next.js) from the heavy video-processing workloads (Python FastAPI + Celery). This separation ensures the web application never crashes or lags while handling large video processing tasks.

### Core Technology Stack:

1.  **Frontend:** Next.js (React), Tailwind CSS
2.  **Backend API:** Python FastAPI
3.  **Database:** PostgreSQL (managed via SQLAlchemy)
4.  **Message Broker:** Redis
5.  **Task Queue:** Celery Workers
6.  **Media Processing Engine:** `yt-dlp` & `FFmpeg`

---

## The Workflow Pipeline (End-to-End)

```mermaid
flowchart TD
    User([User]) -->|1. Request Clip| UI[Next.js Frontend]
    UI -->|2. POST /api/clip| API[FastAPI Backend]

    API -->|3. Create Job PENDING| DB[(PostgreSQL)]
    API -->|4. Publish Job Ticket| Redis[(Redis Broker)]
    API -.->|Returns Job ID| UI

    Worker[Celery Worker] -->|5. Claims Job Ticket| Redis
    Worker -->|6. Update PROCESSING| DB

    Worker -->|7. yt-dlp fetches HD Video| YT[(YouTube CDN)]
    Worker -->|8. yt-dlp fetches Audio| YT
    YT -.->|Saves raw .mp4 and .m4a| Worker
    Worker -->|9. Live Progress 0-50%| Redis

    UI -->|Poll /progress| API
    API -->|Read Live Progress| Redis

    Worker -->|10. FFmpeg precision-seeks| Worker
    Worker -->|11. FFmpeg merges video & audio| Worker
    Worker -->|12. Live Progress 50-100%| Redis

    Worker -->|13. Update COMPLETED| DB
    API -->|Poll sees COMPLETED| DB
    UI -.->|14. Present Download Button| User
```

### Detailed Sequence Flow

```mermaid
sequenceDiagram
    participant User
    participant NextJS as Next.js (Frontend)
    participant FastAPI as Python (Backend)
    participant Postgres as PostgreSQL
    participant Redis as Redis Queue
    participant Celery as Celery Worker
    participant YouTube

    User->>NextJS: 1. Request Clip (URL, Trims)
    NextJS->>FastAPI: 2. POST /api/clip
    FastAPI->>Postgres: 3. Create Job (Status: PENDING)
    FastAPI->>Redis: 4. Publish Job Ticket
    FastAPI-->>NextJS: Returns Job ID

    Celery->>Redis: 5. Claims Job Ticket
    Celery->>Postgres: 6. Update (Status: PROCESSING)

    par Media Download
        Celery->>YouTube: 7. yt-dlp fetches distinct HD Video
        Celery->>YouTube: 8. yt-dlp fetches distinct Audio
        YouTube-->>Celery: Saves raw separate .mp4 and .m4a
        Celery->>Redis: 9. Live Download Progress (0% → 50%)
    end

    loop UI Updates
        NextJS->>FastAPI: Poll /progress & /status
        FastAPI->>Redis: Read Live Progress
        FastAPI-->>NextJS: Render UI Bar seamlessly
    end

    par Trimming & Assembly
        Celery->>Celery: 10. FFmpeg precision-seeks streams
        Celery->>Celery: 11. FFmpeg merges video & audio losslessly
        Celery->>Redis: 12. Live Encode Progress (50% → 100%)
    end

    Celery->>Postgres: 13. Update (Status: COMPLETED, final URL)
    NextJS->>FastAPI: Poll sees COMPLETED
    NextJS-->>User: 14. Present Download Button
```

When a user requests a video clip, the data flows exactly in this order:

1.  **UI Interaction:** User enters a YouTube URL in `src/app/page.tsx` and defines a start/end time in `src/components/VideoEditor.tsx`.
2.  **Proxy Forwarding:** The frontend POSTs the request to the Next.js API route (`src/app/api/clip/route.ts`), which acts as a secure middleman and forwards it to the Python backend.
3.  **Job Creation:** FastAPI (`Backend-Clip_Service/app/api/clip.py`) receives the request. It logs a new row in the PostgreSQL database with a status of `PENDING` and pushes the job parameters into the Redis message broker.
4.  **Worker Activation:** A Celery Worker (`workers/tasks.py`), constantly listening to Redis, spots the new ticket. It updates the database status to `PROCESSING` and begins execution.
5.  **Downloading:** The worker defers to `downloader.py`, executing `yt-dlp` to download the specific raw high-quality Video and Audio streams separately directly from YouTube's CDNs to avoid speed throttling.
6.  **Progress Tracking:** While downloading and formatting, the worker rapidly updates Redis with its current percentage. The frontend UI constantly polls the backend to read these Redis values for real-time progress bars.
7.  **Processing (FFmpeg):** `downloader.py` executes a heavily optimized `FFmpeg` bash command that takes the two raw audio/video files, seeks directly to the user's timestamps, and identically losslessly merges them into a final `.mp4` or `.mp3` file.
8.  **Job Completion:** The Celery Worker updates the PostgreSQL database to `COMPLETED`, attaches the final file download URL, and cleans up the temporary raw files.
9.  **Frontend Update:** The UI polling detects the `COMPLETED` flag, switches the progress bar to a green "DOWNLOAD" button, and the user receives their file.

---

## Detailed Directory & File Breakdown

### 1. Frontend: The Next.js Application

_Location: `src/`_

#### `src/app/page.tsx`

- **Role:** The main landing page.
- **Functions:** Handles the primary search bar where users paste YouTube URLs. It fetches initial video metadata (title, duration, thumbnail) via backend routes and stores it in `sessionStorage` before revealing the editor interface.

#### `src/components/VideoEditor.tsx`

- **Role:** The core interactive clipping interface.
- **Functions:**
  - **`handleClip()`:** The trigger function. Takes the user's `startTime`, `endTime`, `format`, and `quality` and POSTs them to the backend to begin processing. Starts the 3-second polling interval to fetch live `PROCESSING` progress percentages from the database.
  - **`fetchClips()`:** Queries the database for the status of the user's recent tasks, but fundamentally relies on the browser's `localStorage` to know _which_ clips this specific browser is actually tracking.
  - **`handleCancelProcessing()`:** Sends an interrupt signal (`/cancel`) to the backend if the user aborts an active job, and actively scrubs the job from the local UI state.

#### `src/app/clips/page.tsx`

- **Role:** The global history page for all generated clips.
- **Functions:** A consolidated view that reads from `localStorage` to render every previous processing success, failure, or active download. Sits on a cross-tab React listener to update live if a clip is requested or deleted in another browser tab.

#### `src/app/api/...` (Next.js Proxies)

- **Role:** The middleman translators.
- **Functions:** Because the React frontend shouldn't talk directly to a cross-origin Python server, Next.js sets up native API routes (`/api/clip`, `/api/clips/progress`, etc.) that ingest the client's request and cleanly `fetch()` the exact same parameters over to FastAPI.

---

### 2. Backend API: FastAPI + PostgreSQL

_Location: `Backend-Clip_Service/app/`_

#### `app/api/clip.py`

- **Role:** The ingestion point for new clipping tasks.
- **Functions:** Receives the Next.js target data, logs a pristine `Clip` record in PostgreSQL via SQLAlchemy with a `PENDING` tag, and explicitly kicks off the `process_clip_task.delay()` function, pushing the heavy payload into Redis for Celery to find.

#### `app/api/status.py`

- **Role:** The real-time status tracker.
- **Functions:**
  - **`get_clip_status()`:** Rapidly queries PostgreSQL to report if a job is `COMPLETED`, `FAILED`, or `PROCESSING`.
  - **`cancel_clip()`:** If a user aborts, this endpoint forcefully injects a kill-flag (`cancel_job:<clip_id> = "1"`) into Redis. The isolated Celery worker monitoring that specific clip will see the flag and immediately self-terminate its FFmpeg processes.

#### `app/models.py`

- **Role:** The Database Schema.
- **Functions:** Defines the strict `Clip` table layout (ID, VideoID, Status, StartTime, EndTime, Format, URL location, etc.) ensuring robust data persistence.

---

### 3. The Processing Engine: Celery + FFmpeg

_Location: `Backend-Clip_Service/`_

#### `workers/tasks.py`

- **Role:** The background worker brain.
- **Functions:**
  - **`process_clip_task()`:** Automatically triggered when Redis alerts it to a new job. It transitions the database to `PROCESSING`, boots up a small cancellation-monitor daemon thread (to watch for the Redis kill-flag mentioned above), and executes the `downloader.py` script. Acts as the massive try/catch block handling crashes or failures.

#### `services/downloader.py`

- **Role:** The raw media manipulator, executing bash shell processes.
- **Functions:**
  - **`yt_dlp_hook()`:** A real-time injection hook. As `yt-dlp` rapidly chunks the YouTube CDN data, this hook scales that download percentage from 0%→50% and pushes it live to Redis so the user sees a smoothly moving UI bar.
  - **FFmpeg Compilation:** Generates bash instructions: `ffmpeg -ss <start> -i video.mp4 -ss <start> -i audio.m4a -t <duration> -c:v copy -c:a copy output.mp4`. This explicitly avoids re-encoding video tracks wherever identically possible, guaranteeing mathematically perfect, instantaneous video assembly. It scales its progress from 50%→100% back to Redis.
