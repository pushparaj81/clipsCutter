# Activate the environment in Git Bash

source venv/Scripts/activate


 
# Start the API

python -m uvicorn app.main:app --reload --port 8000
 
source venv/Scripts/activate

pip install -r requirements.txt

python -m celery -A workers.celery_app worker --loglevel=info -P solo -Q clips,celery



# Clips Cutter

A web application to clip YouTube videos by specifying a start and end time, built with Next.js, Prisma, and PostgreSQL. similar to [clipscutter.com](https://clipscutter.com).

## Overview

Users can input a YouTube link (or other supported links), select a start and end point, and download the clipped video segment.

## Features

- **Video Input**: Paste a YouTube link.
- **Time Selection**: Specify start and end times for the clip.
- **Quality Selection**: Choose video quality (e.g., 360p, 720p).
- **Format Selection**: Choose output format (e.g., MP4).
- **Processing**: Backend downloads and cuts the video using `ffmpeg`.
- **Download**: Direct download of the processed clip.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Video Processing**: `ffmpeg` (via `fluent-ffmpeg` / `ffmpeg-static`) & `yt-dlp` (or equivalent)
- **Styling**: TailwindCSS

## API Structure

### Video Clipping Endpoint

**POST** `/api/clip`

**Request Body:**

```json
{
  "videoId": "FZHjjUXRgRA",
  "sourceID": "c4657623-0057-460b-9f07-365276adf266",
  "title": "Genshin Impact | RTX 4060 8GB ( 4K Maximum Settings )",
  "startTime": 296,
  "endTime": 342,
  "quality": "360p",
  "format": "mp4",
  "type": "video",
  "is_available": true,
  "cc_id": "0f2115f458b7b852076619535a1c7c6c:...",
  "gv3": "eyJhbGciOiJIUzI1NiJ9..."
}
```

**Response:**

- Success: Returns the downloadable file or a unique download link.
- Error: Returns standard error message.

## Setup

1.  Clone the repository.
2.  Install dependencies: `npm install`
3.  Configure environment variables (DATABASE_URL, etc.).
4.  Run Prisma migrations: `npx prisma migrate dev`
5.  Start the development server: `npm run dev`
