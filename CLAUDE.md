# TCG Project Development Guide

## Background

This project solves a niche problem for a specific group of users. Those users are players and collectors of the YuGiOh trading card game who rely on package forwarding services to receive packages. The primary marketplace for YuGiOh cards is TCGPlayer.com, a site where individual sellers can list cards for sale. When an order is made, each seller will ship their package seperately. Due to how lightweight trading cards are, it is often much cheaper to order multiple cards from the same seller. To facilitate this, this project allows a user to indicate what cards they are interested in purchasing. The API then uses the TCGPlayer REST API to obtain card prices and provides a user with a list of sellers and what cards they have available for purchase. The user can use this information to inform their purchasing decisions. 

## Commands
- `pnpm run dev` - Start development server at http://localhost:3000
- `pnpm run lint` - Run ESLint
- `pnpm run lint:fix` - Run ESLint with auto-fix
- `pnpm run build` - Build for production
- `pnpm run preview` - Preview production build

## Code Style
- **Indentation**: 4 spaces (configured in eslint)
- **Quotes**: Single quotes (configured in eslint)
- **Semicolons**: No semicolons (configured in eslint)
- **Naming**: camelCase for variables/properties, PascalCase for components
- **Vue Components**: Use `<script lang="ts" setup>` pattern
- **Error Handling**: Use try/catch with specific error typing (`error instanceof Error`)
- **Types**: Use TypeScript throughout and zod for schema validation
- **Imports**: Group imports by external/internal, no unused imports

## Libraries

The following libraries are used in the project:
- Vue-Query
- Nuxt UI 3
- TailwindCSS 4
- Drizzle ORM
- date-fns



## UI Components

We are using the new, alpha version of Nuxt UI. I have included the documentation of this version in the nuxt-ui-v3-docs folder. Each file corresponds to a different component.
The following components are available:
- accordion
- alert
- app
- avatar-group
- avatar
- badge
- breadcrumb
- button-group
- button
- calendar
- card
- carousel
- checkbox
- chip
- collapsible
- color-picker
- command-palette
- container
- context-menu
- drawer
- dropdown-menu
- form-field
- form
- icon
- input
- input-menu
- input-number
- kbd
- link
- modal
- navigation-menu
- pagination
- pin-input
- popover
- progress
- radio-group
- select
- select-menu
- separator
- skeleton
- slideover
- slider
- stepper
- switch
- table
- tabs
- textarea
- toast
- tooltip
- tree

## API Structure
- RESTful endpoints in `server/api/`
- Database schema in `shared/utils/schema.ts`
- Runtime type validation with zod via drizzle-zod