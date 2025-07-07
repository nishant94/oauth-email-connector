# Email Connector

A full-stack email OAuth integration application that enables users to connect their Gmail and Outlook accounts, send emails, and track email analytics.

## Overview

This project provides a comprehensive email management solution with:
- OAuth integration for Gmail and Outlook
- Email composition and sending
- Email tracking and analytics
- User authentication and session management
- Email statistics

## Tech Stack

### Backend
- **Node.js** with **Express.js**
- **TypeScript** for type safety
- **MongoDB** with **Mongoose** for data persistence
- **Passport.js** for OAuth authentication (Google & Microsoft)
- **Express Session** with MongoDB store
- **Rate limiting** and security middleware

### Frontend
- **React 19** with **TypeScript**
- **Vite** for fast development and building
- **TailwindCSS** for styling
- **React Router** for navigation

## Project Structure

```
email-connector/
├── backend/                    # Node.js API server
│   ├── src/
│   │   ├── config/            # Database, environment, and passport configuration
│   │   ├── middleware/        # Authentication, validation, and rate limiting
│   │   ├── models/           # MongoDB models (User, Email, EmailTracking)
│   │   ├── routes/           # API routes (auth, email, tracking, user)
│   │   ├── services/         # Business logic (email service)
│   │   ├── types/            # TypeScript type definitions
│   │   ├── utils/            # Utility functions and helpers
│   │   └── index.ts          # Application entry point
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                  # React application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   └── ui/          # Base UI components (shadcn/ui)
│   │   ├── context/         # React context providers
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utility libraries
│   │   ├── pages/           # Page components
│   │   ├── services/        # API service functions
│   │   └── types/           # TypeScript type definitions
│   ├── package.json
│   └── vite.config.js
│
└── README.md                 # This file
```

## Prerequisites

Before setting up the project, ensure you have:

- **Node.js** (v18 or higher)
- **pnpm and npm**
- **MongoDB** instance (local or cloud)
- **Google OAuth credentials**
- **Microsoft OAuth credentials**

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd oauth-email-connector
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install
```

#### Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Server Configuration
SESSION_SECRET=session_secret_key
JWT_SECRET=jwt_secret_key
JWT_EXPIRES_IN=7d

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:6333/api/auth/connect/google/callback
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_REDIRECT_URI=http://localhost:6333/api/auth/connect/microsoft/callback
PORT=6333
NODE_ENV=development

MONGODB_URI=
FRONTEND_URL=http://localhost:5173
APP_URL=public_backend_URL_for_email_tracking
```

#### Start Backend Development Server

```bash
npm run dev
```

The backend server will start on `http://localhost:3001`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The frontend application will start on `http://localhost:5173`

## Available Scripts

### Backend Scripts

```bash
npm run dev      # Start development server with nodemon
npm run build    # Build TypeScript to JavaScript
npm run start    # Start production server
```

### Frontend Scripts

```bash
pnpm dev         # Start development server
pnpm build       # Build for production
```
