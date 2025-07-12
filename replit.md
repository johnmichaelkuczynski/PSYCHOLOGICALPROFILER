# Cognitive Profiler Application

## Overview

The Cognitive Profiler is a web application that analyzes writing samples to generate insights about the author's cognitive patterns, reasoning style, and estimated intelligence. The application uses an AI-powered text analysis system to process user submissions and provide detailed cognitive profiles.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The Cognitive Profiler uses a modern stack with React on the frontend and Express.js on the backend, following a client-server architecture pattern. The application utilizes a Neon PostgreSQL database (via Drizzle ORM) for data persistence with strict user isolation. 

The system is structured into distinct layers:
1. **Client Layer**: React-based UI with Tailwind CSS and shadcn/ui components
2. **Server Layer**: Express.js API handling business logic and external API calls
3. **Data Layer**: Drizzle ORM with Neon PostgreSQL integration for data persistence
4. **External Integration**: Multi-provider AI analysis (OpenAI, Anthropic, DeepSeek, Perplexity)

## Recent Changes (Updated: December 2024)

### Database Implementation with User Isolation
- ✅ Implemented Neon PostgreSQL database with UUID-based user isolation
- ✅ Created comprehensive schema with users, documents, analysis_requests, and comprehensive_reports tables
- ✅ All queries strictly filtered by user_id to prevent cross-user data access
- ✅ Implemented NeonStorage class with proper security measures

### API Provider Reactivation
- ✅ Reactivated all four AI providers: OpenAI, Anthropic, DeepSeek, and Perplexity
- ✅ All API keys properly configured and tested
- ✅ Multi-provider analysis system fully functional

### Frontend Architecture

The frontend is built with React and uses a component-based architecture with a modern, clean UI powered by Tailwind CSS and shadcn/ui components. It implements:

- React hooks for state management and side effects
- React Query for data fetching and caching
- TypeScript for type safety
- Wouter for routing (a lightweight alternative to React Router)
- Responsive design with mobile-first approach

### Backend Architecture

The backend uses Express.js as the API server with TypeScript and follows a modular pattern with clear separation of concerns:

- RESTful API endpoints for frontend interaction
- Middleware for request handling and logging
- Integration with OpenAI API for text analysis
- Data storage via Drizzle ORM

### Database Schema

The database uses Drizzle ORM with a PostgreSQL adapter and includes the following tables:

1. `users` - For authentication and user management
   - id (PK)
   - username (unique)
   - password

2. `analysis_requests` - For storing text analysis data
   - id (PK)
   - text (the submitted content)
   - result (the analysis results)
   - created_at (timestamp)

## Key Components

### Client Components

1. **UI Components**: A comprehensive set of reusable UI components from shadcn/ui (buttons, cards, forms, etc.)
2. **Pages**: 
   - Home page with text input and analysis display
   - Error pages
3. **Feature Components**:
   - `IntroSection`: Application introduction
   - `InputSection`: Text submission interface
   - `ProcessingIndicator`: Loading state UI
   - `ResultsSection`: Analysis results display
   - `ErrorSection`: Error handling UI
   - `HelpModal`: Information modal

### Server Components

1. **API Routes**: RESTful endpoints for the frontend
2. **OpenAI Integration**: Service for text analysis via OpenAI API
3. **Storage**: Data persistence layer with Drizzle ORM
4. **Middleware**: Request processing, logging, error handling

## Data Flow

1. **Text Analysis Flow**:
   - User submits text through frontend
   - Request goes to `/api/analyze` endpoint
   - Server validates the input (min 100 characters)
   - Server forwards request to OpenAI API
   - Server receives analysis results and returns them to the client
   - Client renders the analysis results
   - (Optional) Results can be stored in the database

2. **Error Handling Flow**:
   - Input validation errors trigger client-side feedback
   - API errors are caught and formatted for the client
   - Server-side errors are logged and graceful error responses are returned

## External Dependencies

### Frontend Dependencies

- React and React DOM for UI
- Tailwind CSS for styling
- shadcn/ui for component library
- React Query for data fetching
- Wouter for routing
- Lucide React for icons

### Backend Dependencies

- Express.js for API server
- OpenAI SDK for AI analysis
- Drizzle ORM for database operations
- Zod for validation

### Development Dependencies

- TypeScript for type safety
- Vite for frontend building and development
- ESBuild for server bundling
- TSX for TypeScript execution

## Deployment Strategy

The application is configured for deployment on Replit with automatic scaling:

1. **Build Process**:
   - Frontend is built with Vite
   - Backend is bundled with ESBuild
   - Output is combined into a single deployment package

2. **Runtime Configuration**:
   - Environment variables for configuration
   - PostgreSQL database via Replit's built-in service
   - Production mode optimizations

3. **Scalability**:
   - Configured for auto-scaling on Replit
   - Stateless application design for horizontal scaling

The application requires the following environment variables:
- `DATABASE_URL`: Connection string for PostgreSQL database
- `OPENAI_API_KEY`: API key for OpenAI services
- `NODE_ENV`: Environment setting (development/production)

## Development Workflow

1. Run `npm run dev` for local development with hot reloading
2. Use `npm run check` to verify TypeScript types
3. Apply database schema changes with `npm run db:push`
4. Build for production with `npm run build`
5. Start production server with `npm run start`