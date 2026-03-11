```markdown
# CodeIt

CodeIt is a **browser-based online IDE** that allows users to create projects, edit multiple files, and collaborate through role-based project sharing.  
The system provides a modern coding environment similar to lightweight cloud IDEs, with project management and secure authentication.

---

# Features

### Authentication
- User signup and login
- JWT based authentication
- Secure protected API routes

### Project Management
- Create and manage coding projects
- View owned projects
- View projects shared with the user
- Rename projects
- Delete projects

### File Management
- Create and manage multiple files inside a project
- File sidebar navigation
- Persistent file storage in MongoDB

### Code Editing
- Monaco Editor integration (VSCode editor engine)
- Language detection
- Syntax highlighting

### Project Sharing
Users can share projects with different access levels:

| Role | Permissions |
|-----|-------------|
| OWNER | Full control, manage members |
| WRITER | Edit files |
| READER | Read-only access |

### Access Control
- Middleware enforcement of project roles
- Role-based API protection

---

# Planned Features

- Code execution via **Judge0 API**
- AI-powered code explanation
- Controlled collaboration (single active editor)
- Real-time collaboration (future phase)

---

# Tech Stack

## Frontend
- **Next.js (App Router)**
- **React**
- **TypeScript**
- **TailwindCSS**
- **Monaco Editor**

## Backend
- **Node.js**
- **Express**
- **TypeScript**
- **MongoDB (Mongoose)**

## Development Tools
- Git
- GitHub
- ESLint

---

# Project Architecture

The project is divided into **frontend** and **backend** services.

```

codeit
│
├── backend
│   ├── src
│   │   ├── db
│   │   │   ├── mongo.ts
│   │   │   └── models
│   │   │       ├── User.ts
│   │   │       ├── Project.ts
│   │   │       ├── ProjectAccess.ts
│   │   │       └── File.ts
│   │   │
│   │   ├── routes
│   │   │   ├── auth.routes.ts
│   │   │   ├── project.routes.ts
│   │   │   ├── file.routes.ts
│   │   │   └── share.routes.ts
│   │   │
│   │   ├── middleware
│   │   │   ├── authJwt.ts
│   │   │   └── requireProjectRole.ts
│   │   │
│   │   ├── services
│   │   │   └── auth.service.ts
│   │   │
│   │   └── server.ts
│   │
│   ├── package.json
│   └── tsconfig.json
│
├── frontend
│   ├── src
│   │   ├── app
│   │   │   ├── auth
│   │   │   │   ├── login
│   │   │   │   └── signup
│   │   │   │
│   │   │   ├── playground
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   ├── project
│   │   │   │   └── [id]
│   │   │   │       ├── page.tsx
│   │   │   │       └── settings
│   │   │   │           └── page.tsx
│   │   │   │
│   │   │   └── page.tsx
│   │   │
│   │   ├── components
│   │   │   ├── editor
│   │   │   │   ├── EditorPane.tsx
│   │   │   │   └── FileSidebar.tsx
│   │   │   │
│   │   │   ├── playground
│   │   │   ├── project-settings
│   │   │   └── projects
│   │   │
│   │   ├── hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── usePlayground.ts
│   │   │   ├── useProjectEditor.ts
│   │   │   └── useProjectSettings.ts
│   │   │
│   │   └── lib
│   │       ├── api.ts
│   │       ├── auth.ts
│   │       ├── files.ts
│   │       ├── projects.ts
│   │       └── projectDetail.ts
│   │
│   └── public
│
└── README.md

```

---

# Database Design

The backend uses **MongoDB** with the following main collections:

### Users
Stores registered users.

```

User
├─ _id
├─ email
├─ passwordHash
└─ createdAt

```

### Projects

```

Project
├─ _id
├─ name
├─ ownerId
├─ visibility
└─ createdAt

```

### ProjectAccess

```

ProjectAccess
├─ userId
├─ projectId
└─ role (OWNER | WRITER | READER)

```

### Files

```

File
├─ projectId
├─ name
├─ content
└─ language

```

---

# API Overview

### Authentication

```

POST /auth/signup
POST /auth/login

```

### Projects

```

POST /projects
GET /projects
PATCH /projects/:id
DELETE /projects/:id

```

### Files

```

POST /files
GET /files/:projectId
PATCH /files/:id
DELETE /files/:id

```

### Sharing

```

POST /projects/:id/share
PATCH /projects/:id/share
DELETE /projects/:id/share

````

---

# Installation

## Clone the repository

```bash
git clone git@github.com:<your-username>/codeit.git
cd codeit
````

---

# Backend Setup

```
cd backend
npm install
```

Create `.env`

```
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret
```

Run server:

```
npm run dev
```

Backend will run on:

```
http://localhost:5000
```

---

# Frontend Setup

```
cd frontend
npm install
```

Create `.env.local`

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

Run frontend:

```
npm run dev
```

Frontend will run on:

```
http://localhost:3000
```

---

# Development Workflow

Make changes:

```
git add .
git commit -m "describe changes"
git push
```

---

# Author

Roni Datta
BUET – CSE

---

# License

This project is developed for academic and educational purposes.

```
```
