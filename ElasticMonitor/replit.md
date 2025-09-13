# NetScope - Network Monitoring Dashboard

## Overview

NetScope is a comprehensive network monitoring and security dashboard built as a full-stack web application. The system provides real-time network traffic monitoring, security alert management, and detailed logging capabilities for network administrators. It features a modern React-based frontend with a dark theme and an Express.js backend with PostgreSQL database integration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Components**: Built with shadcn/ui component library using Radix UI primitives
- **Styling**: Tailwind CSS with custom dark theme and CSS variables for consistent theming
- **State Management**: TanStack React Query for server state management and data fetching
- **Routing**: Wouter for lightweight client-side routing
- **Charts**: Chart.js for data visualization and traffic metrics
- **Real-time Updates**: WebSocket integration for live data streaming

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **API Design**: RESTful endpoints with WebSocket support for real-time features
- **Development Setup**: Hot module replacement with Vite integration
- **Error Handling**: Centralized error middleware with structured logging
- **Session Management**: Express sessions with PostgreSQL session store

### Database Design
The system uses a PostgreSQL database with the following core entities:

- **Users**: Authentication and user management
- **Network Logs**: Detailed traffic logging with source/destination tracking
- **Alerts**: Security alerts with severity levels and resolution tracking
- **Connections**: Active connection monitoring with bandwidth tracking
- **Traffic Metrics**: Aggregated network performance data

Key design decisions include using JSONB for flexible metadata storage and timestamp-based partitioning for efficient log querying.

### Real-time Features
- **WebSocket Integration**: Bi-directional communication for live updates
- **Network Monitor Service**: Background service for continuous traffic analysis
- **Anomaly Detection**: Automated alert generation based on traffic patterns
- **Live Dashboard Updates**: Real-time metrics and alert notifications

### UI/UX Architecture
- **Component Structure**: Modular components with clear separation of concerns
- **Design System**: Consistent dark theme with professional cybersecurity aesthetic
- **Responsive Design**: Mobile-first approach with responsive breakpoints
- **Accessibility**: ARIA labels and keyboard navigation support

## External Dependencies

### Core Framework Dependencies
- **React & TypeScript**: Primary frontend framework with type safety
- **Express.js**: Backend web framework for API and static file serving
- **Vite**: Build tool and development server with hot module replacement

### Database & ORM
- **PostgreSQL**: Primary database via Neon serverless
- **Drizzle ORM**: Type-safe database operations and migrations
- **Drizzle Kit**: Database schema management and migration tools

### UI & Styling
- **Tailwind CSS**: Utility-first CSS framework for styling
- **shadcn/ui**: Pre-built component library based on Radix UI
- **Radix UI**: Unstyled, accessible UI primitives
- **Lucide React**: Icon library for consistent iconography

### Data Management
- **TanStack React Query**: Server state management and caching
- **React Hook Form**: Form state management with validation
- **Zod**: Runtime type validation for API data

### Visualization & Charts
- **Chart.js**: Data visualization for network traffic charts
- **date-fns**: Date manipulation and formatting utilities

### Development Tools
- **TypeScript**: Static type checking across the entire stack
- **ESBuild**: Fast JavaScript bundling for production builds
- **PostCSS**: CSS processing with Tailwind integration

### Real-time Communication
- **WebSocket (ws)**: Real-time bidirectional communication
- **Custom WebSocket hooks**: React integration for WebSocket connections

### Authentication & Sessions
- **connect-pg-simple**: PostgreSQL session store for Express sessions
- **Password hashing**: Secure user authentication (implementation ready)

The architecture emphasizes type safety, real-time capabilities, and scalable data handling for network monitoring use cases.