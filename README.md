# Realtor CRM — Frontend

Frontend application for a full-stack Realtor CRM platform.

This project provides a modern web interface for managing leads, tasks, and daily workflow for a real estate professional.

The frontend communicates with a Node.js / Express backend and PostgreSQL database to display and manage CRM data in real time.

---

# Live Project Status

🚧 Currently in active development

Core features implemented:

- Lead management
- Task management
- Dashboard overview
- API integration with backend services

---

```bash
┌───────────────────────────┐
│        Next.js App        │
│     React + Tailwind      │
└─────────────┬─────────────┘
              │ REST API
              ▼
┌───────────────────────────┐
│      Express Backend      │
│      Business Logic       │
└─────────────┬─────────────┘
              │ SQL Queries
              ▼
┌───────────────────────────┐
│      PostgreSQL DB        │
│      Leads + Tasks        │
└───────────────────────────┘
```

# Tech Stack

Frontend Framework

- Next.js (App Router)
- React

Styling

- TailwindCSS
- Custom UI components

Data Fetching

- REST API
- Fetch / custom API utilities

Architecture

- Component-based UI
- Client + server rendering
- Modular route structure

---

# Features

## Leads Management

Create and manage client leads.

Fields include:

- First name
- Last name
- Email
- Phone
- Budget range
- Source
- Status
- Notes

Users can:

- View all leads
- Create new leads
- Navigate to lead detail pages
- Track updates

---

## Task Management

Track follow-ups and reminders for each lead.

Tasks include:

- Title
- Description
- Due date
- Status
- Linked lead

Features:

- Task summary dashboard
- Filter by status
- Upcoming / overdue task indicators

---

## Dashboard

Central overview of task activity.

Displays:

- Overdue tasks
- Tasks due today
- Upcoming tasks

Provides quick navigation to active work.

---

# Project Structure

```bash
app/
dashboard/
leads/
tasks/
components/
ui/
lib/
api.js
```

Key concepts:

- **App Router** used for route organization
- **Reusable UI components**
- **API abstraction layer** for backend communication

---

# Running Locally

Clone the repository

```bash
git clone https://github.com/taxidriver802/crm-frontend
```

Install dependencies

```bash
npm install
```

Create environment file

```bash
.env.local

EX:
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

Run development server

```bash
npm run dev
```

Open in browser:

```bash
http://localhost:3000
```

---

# Backend Repository

The frontend communicates with a dedicated backend API.

Backend repo:

```bash
crm-backend
```

Technologies:

- Node.js
- Express
- PostgreSQL

---

# Future Improvements

Planned features include:

- Authentication system
- Role-based access
- Email integrations
- Zillow / external lead imports
- Analytics dashboard
- Mobile optimization

---

# Author

Jason Cox  
Full-Stack Developer

Portfolio  
https://jasoncox.dev

GitHub  
https://github.com/Taxidriver802
