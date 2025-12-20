# OpenRelik UI Project Context

## Project Overview

**OpenRelik UI** is the web based frontend for the OpenRelik digital forensic artifact workflow system. It provides a visual interface for managing files, folders, and workflows, allowing users to orchestrate forensic tasks and analyze results.

- **Type:** Single Page Application (SPA)
- **Framework:** Vue 3 (Composition API)
- **UI Library:** Vuetify 3 (Material Design)
- **Build Tool:** Vite
- **Language:** JavaScript (ESNext)

## Architecture & Key Components

### Tech Stack

- **Frontend Core:** Vue 3, Vue Router, Pinia (State Management).
- **Networking:** Axios (with interceptors for Auth/CSRF), Server-Sent Events (SSE) for real-time updates.
- **Visualization:** ApexCharts (via `vue3-apexcharts`).
- **Styles:** SCSS, Vuetify styles.
- **Testing:** Vitest, Vue Test Utils, Happy DOM.
- **Containerization:** Docker, Nginx (for serving the build).

### Directory Structure

- `src/views/`: Main application pages (e.g., `Home.vue`, `Folder.vue`, `File.vue`, `Investigation.vue`).
- `src/components/`: Reusable UI components. `WorkflowCanvas/` contains logic for the visual workflow editor.
- `src/stores/`: Pinia stores for global state management (`user.js`, `workflow.js`).
- `src/composables/`: Reusable logic hooks (e.g., `useUserSettings.js`, `useWorkflowCanvasView.js`).
- `src/plugins/`: Vue plugins configuration (Vuetify, etc.).
- `src/RestApiClient.js`: Centralized API client service. Wraps Axios and handles authentication, token refreshing, and specific API endpoints.
- `src/styles/`: Global SCSS files (`global.scss`, `settings.scss`).
- `nginx/`: Nginx configuration for production deployment.

## Development & Usage

### Prerequisites

- Node.js (LTS recommended)
- yarn

### Key Commands

All commands are run from the project root.

| Action                 | Command                  | Description                                 |
| :--------------------- | :----------------------- | :------------------------------------------ |
| **Development Server** | `yarn run dev`           | Starts Vite dev server (default port 3000). |
| **Build**              | `yarn run build`         | Builds the application for production.      |
| **Preview Build**      | `yarn run preview`       | Locally preview the production build.       |
| **Lint**               | `yarn run lint`          | Runs ESLint to fix and format code.         |
| **Test**               | `yarn run test`          | Runs unit tests using Vitest.               |
| **Test Coverage**      | `yarn run test:coverage` | Runs tests and generates a coverage report. |

### Configuration

- **Environment Variables:**
  - `src/settings.js` handles configuration, often reading from window globals injected at runtime (common in containerized setups) or defaulting to local values.
  - API URL and Version are configurable.
- **Vite Config:** `vite.config.mjs` handles plugins, aliases (`@` -> `src`), and proxy settings.

## Development Conventions

- **Component Style:** Use the Vue 3 **Composition API** (`<script setup>`).
- **State Management:** Use **Pinia** stores for state that needs to be shared across components. Avoid `vuex`.
- **Styling:** Leverage **Vuetify** components and utility classes first. Use custom SCSS in `src/styles/` only when necessary.
- **API Interaction:** **Do not** make raw `axios` or `fetch` calls in components. Always add new API methods to `src/RestApiClient.js` and import them.
- **Asynchronous Operations:** Handle loading states and errors gracefully, utilizing the global `AppSnackbar` (via event bus or store) for user feedback.
- **Testing:** Write unit tests for new components and logic using Vitest. Place tests in `__tests__` directories next to the source files.
- **Linting:** Ensure code passes ESLint rules (Standard JS + Vue configs) before committing.
