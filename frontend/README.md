# Numerology Calculator - Frontend

A modern React + Vite application for calculating numerology values including Root Number, Destiny Number, Natal Grid, Mahadasha, and Antardasha.

## Tech Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **date-fns** - Date utilities
- **Lucide React** - Icons

## Architecture (MVC Pattern)

```
src/
├── models/          # Data models and API services
│   ├── types.ts     # TypeScript type definitions
│   └── api.ts       # API service layer
├── controllers/     # Business logic hooks
│   ├── useNumerology.ts    # Numerology calculation logic
│   └── useYearSelector.ts  # Year selection logic
├── views/           # UI components
│   ├── components/  # Reusable UI components
│   └── pages/       # Page components
├── utils/           # Utility functions
└── main.tsx         # App entry point
```

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:3001`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Environment Variables

Create a `.env` file:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## Mobile Conversion

This app can be easily converted to a mobile app using:

- **Capacitor** - Convert web app to native iOS/Android
- **PWA** - Progressive Web App support

## Project Structure

- **Models**: Define data structures and API interactions
- **Controllers**: Handle business logic and state management
- **Views**: Present UI components and pages

This MVC pattern ensures:
- Separation of concerns
- Easy testing
- Scalability
- Maintainability
