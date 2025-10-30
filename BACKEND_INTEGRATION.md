# Backend Integration Guide

## Overview
This React frontend is designed to connect to your Java Spring Boot backend API.

## Important Note
⚠️ **Lovable runs on React/TypeScript/Vite stack and cannot run Java Spring Boot backend code.**

This project provides a complete, production-ready frontend that includes:
- ✅ Excel parsing and preview (runs in browser)
- ✅ Multi-step import wizard
- ✅ Structure validation UI
- ✅ Difference center with filters
- ✅ Version history viewer
- ✅ Bilingual support (中文/English)

## Backend API Integration

### Configuration
Set your Java backend URL in `.env` file:
```env
VITE_API_BASE_URL=http://localhost:8080/api
```

### API Endpoints Expected

The frontend expects these REST endpoints from your Spring Boot backend:

#### Vendors
- `GET /api/vendors` - Get all vendors
- `GET /api/channels?vendorId={id}` - Get channels by vendor

#### Rate Imports
- `POST /api/rate-imports` - Create new import job
  - Body: `{ file: File, vendorId: number }`
  - Returns: `ImportJob`

- `GET /api/rate-imports/{jobId}/sheets` - Get parsed sheets
- `GET /api/rate-imports/{jobId}/structure-diff?channelId={id}` - Get structure comparison
- `POST /api/rate-imports/{jobId}/confirm-structure` - Confirm structure actions
- `POST /api/rate-imports/{jobId}/publish` - Publish imported rates

#### Rate Diffs
- `GET /api/rate-diff?channelId={id}&sheetId={id}&startDate={date}&endDate={date}`
  - Returns: `RateDiff[]`

#### Version History
- `GET /api/channels/{channelId}/versions` - Get all versions for a channel

### Data Models

See `src/types/index.ts` for TypeScript interfaces that match your database tables.

### Current State

The frontend currently uses **mock data** for demonstration. To connect to your real backend:

1. Update `src/services/api.ts` - uncomment the real fetch calls
2. Implement the corresponding REST endpoints in your Spring Boot backend
3. Configure CORS on your Java backend to allow requests from the frontend

### Vendor Template

The YunExpress template JSON is located at:
`public/vendor-templates/yunexpress_template.json`

Your backend should use this template format for parsing vendor-specific Excel files.

## Running the Frontend

```bash
npm install
npm run dev
```

The app will run on `http://localhost:8080`

## Features

### 1. Excel Import Wizard (5 Steps)
- Upload multi-sheet Excel files
- Parse preview with sheet detection
- Weight structure validation (NONE/MINOR/MAJOR)
- Confirm actions for major changes
- Import progress with auto-diff calculation

### 2. Difference Center
- View all price changes
- Filter by vendor, channel, date range
- Export to CSV
- Color-coded delta indicators

### 3. Version History
- View all rate sheet versions
- Current version information
- Historical version comparison

### 4. Vendor Management
- List all logistics vendors
- View channels per vendor

## Next Steps

1. Implement the Java Spring Boot REST API endpoints
2. Configure database with MyBatis-Plus
3. Implement weight structure detection algorithm
4. Set up SHA-256 signature calculation
5. Configure CORS for frontend-backend communication
6. Test end-to-end integration
