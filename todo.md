# TradeCore POS — Multi-page Implementation Checklist

- [x] Define all routes and shared page-shell behavior for the primary navigation.
- [x] Build the POS register and product-manager workflows.
- [x] Build sales, purchases, inventory, cash and bank, expenses, and staff pages.
- [x] Build reports, online orders, website setup, and settings pages.
- [x] Verify desktop and mobile layouts across representative routes.
- [x] Save a reviewed checkpoint and deliver the complete page set.

## Persistent CRUD Upgrade

- [x] Upgrade the project with persistent data and user-aware backend support.
- [x] Define data entities and CRUD APIs for products, sales, purchases, expenses, staff, and online orders.
- [x] Connect page actions, tables, and forms to persistent data.
- [x] Verify create, read, update, and delete operations on desktop and mobile.
- [x] Save and deliver the CRUD-enabled application.

## Multi-Shop Upgrade

- [x] Add persistent shop records and location relationships to operational data.
- [x] Create secure CRUD APIs for shops and shop-scoped records.
- [x] Add active-shop switching to the global application shell.
- [x] Build a shop manager page for creating, editing, and archiving locations.
- [x] Filter POS, sales, purchases, expenses, staff, and orders by the active shop.
- [x] Validate desktop and mobile multi-shop workflows and save a reviewed checkpoint.
- [x] Scope delete actions to the persisted active shop when a page-level mutation does not pass a location explicitly.
- [x] Document the shared catalog and per-shop inventory model across POS-related views.

## Login Experience

- [x] Review the current authentication flow and define the login route behavior.
- [x] Build a branded responsive TradeCore login page.
- [x] Verify desktop and mobile login rendering and the authentication redirect action.
- [x] Save and deliver the login-page update.

## Login Validation Follow-up

- [x] Capture the login route at a mobile breakpoint in an authenticated preview-safe mode.
- [x] Confirm the login action routes into the configured OAuth sign-in flow.
- [x] Save the reviewed login-page checkpoint.

## Public Landing Homepage

- [x] Add a public landing page at `/` for visitors before login.
- [x] Keep the authenticated dashboard accessible after sign-in.
- [x] Add responsive landing-page layout, product messaging, and login CTAs.
- [x] Verify desktop and mobile landing-page behavior and save a reviewed checkpoint.


## Navbar Contrast Fix

- [x] Change landing navbar text and controls to black on the light navbar background.
- [x] Verify navbar readability at desktop and mobile widths.
- [x] Save the reviewed contrast-fix checkpoint.


## Authentication Flow Fix

- [ ] Trace the latest login and logout routes, session hook, and redirect behavior.
- [ ] Fix login and logout handlers so session state and navigation update consistently.
- [ ] Add regression coverage for login redirects and logout session clearing.
- [ ] Verify public, login, dashboard, and logout flows and save a reviewed checkpoint.

