<div align="center">
  <img src="public/logo.png" alt="SEONE Logo" width="150" height="150" />
  
  # 🚀 SEONE.SITE Development

  **A Modern Web Platform powered by React, Vite, and Supabase**

  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
  [![Supabase](https://img.shields.io/badge/Supabase-181818?style=for-the-badge&logo=supabase&logoColor=3ECF8E)](https://supabase.com/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
</div>

<br />

> **Note:** This template provides a minimal but powerful setup to get React working in Vite with HMR, integrated tightly with Supabase backend services, an internal Console workspace, and an online IDE.

## ✨ Key Features

Based on the current architecture, this project includes:
- 🔐 **Authentication:** Secure login, password recovery, and user management via Supabase.
- 💻 **Online IDE:** Built-in code editor and workspace (`CodingWorkspace`, `runners`, `languages`).
- ☁️ **Cloud Files:** Integrated file management and dashboard system.
- 📊 **Management Console:** Admin dashboards for assignments, leaderboards, schedules, and user management.
- 🤖 **Discord Integration:** Automated notifications and support via Supabase Edge Functions (`discord-notify`).

---

## 🛠️ Tech Stack

### Frontend
*   **Framework:** [React 18](https://react.dev/)
*   **Build Tool:** [Vite](https://vitejs.dev/) (Using `@vitejs/plugin-react`)
*   **Routing:** React Router (Handling Public & Private `SEWORK` portals)

### Backend & Infrastructure
*   **Database & Auth:** [Supabase](https://supabase.com/)
*   **Edge Functions:** Deno-based Supabase functions (Discord notify, Admin manage)

---

## 🚀 Getting Started

Follow these steps to set up the project locally.

### 1. Prerequisites
Make sure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for local backend development)

### 2. Installation

Clone the repository and install dependencies:

```bash
# Clone the repository
git clone https://github.com/yourusername/seone.site.git

# Navigate into the directory
cd seone.site

# Install NPM packages
npm install
```

### 3. Environment Variables

Create a `.env` file in the root directory and add your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Running the App

Start the Vite development server with HMR:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

---

## 📁 Project Structure

A quick overview of the top-level files and directories:

```text
SEONE.SITE/
├── public/                 # Static assets (Logos, Icons, Manifest)
├── src/
│   ├── assets/             # Images and global styles
│   ├── components/         # Reusable UI components (Nav, Layouts, ProtectedRoute)
│   ├── contexts/           # React Context providers (AuthContext)
│   ├── lib/                # Config files (supabase.js, discord.js)
│   └── Pages/              # Route components
│       ├── Public/         # Publicly accessible pages (About, IDE, CloudFiles)
│       └── SEWORK/         # Private console & management pages
├── Supabase/               # Backend configurations
│   └── functions/          # Deno Edge Functions (admin-user-manage, discord-notify)
├── .env                    # Environment variables (Ignored in Git)
├── eslint.config.js        # ESLint rules
├── vite.config.js          # Vite configuration
└── package.json            # Project dependencies and scripts
```

---

## ⚡ React Compiler (Optional)

The React Compiler is not enabled on this template by default due to its impact on dev & build performances. To add it, please refer to the [official React Compiler documentation](https://react.dev/learn/react-compiler/installation).

## 🛡️ Linting & TypeScript

This project uses ESLint. If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [Vite TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) into your project in the future.

---

<div align="center">
  <sub>Built with ❤️ for SEONE.SITE</sub>
</div>