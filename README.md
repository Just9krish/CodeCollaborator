# CodeCollaborator

A collaborative code editing platform for real-time development.

## Features

- Real-time collaborative code editing
- Multi-language support (JavaScript, Python, TypeScript, etc.)
- Code execution environment
- Live chat and user presence
- Session management
- File management system
- User authentication

## Tech Stack

**Frontend:**

- React 18, TypeScript, Vite
- Monaco Editor
- Tailwind CSS, shadcn/ui
- WebSocket for real-time features

**Backend:**

- Node.js, Express.js
- PostgreSQL, Drizzle ORM
- Passport.js authentication

## Prerequisites

- Node.js 20.x+
- PostgreSQL
- npm/yarn

## Setup

1. Clone and install dependencies:

```bash
git clone <repository-url>
cd CodeCollaborator
npm install
```

2. Create `.env` file:

```bash
DATABASE_URL=postgresql://username:password@localhost:5432/codecollaborator
SESSION_SECRET=your-session-secret
NODE_ENV=development
```

3. Setup database and start:

```bash
npm run db:push
npm run dev
```

Application runs at `http://localhost:5000`

## Scripts

- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run start` - Production server
- `npm run db:push` - Database migrations
- `npm run format` - Code formatting

## Project Structure

```
CodeCollaborator/
├── client/                 # React frontend
├── server/                 # Express backend
├── shared/                 # Shared schemas
└── migrations/             # Database migrations
```
