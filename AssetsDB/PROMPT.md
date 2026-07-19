# Build Frontend for IT Asset Management Dashboard

## What this app should do
A small internal dashboard (5–10 users) for an IT department to track company hardware.
IT staff can:
- See all assets across companies/locations, filter and page through them
- Add, edit, and (admin-only) delete assets
- Assign an asset to an employee, and check it back in when returned
- See who currently holds what, and each asset's full assignment + audit history
- Manage the small IT user list (admin-only add/delete)
- See a dashboard summary on login: totals, unassigned/overdue/warranty alerts, recent activity

This document only includes pages that the current backend endpoints actually support end-to-end.
A few pages from the original scope (search-by-name on assignments/users, an "assigned count"
column on the user list, a currentHolder column on the asset list, password change) are cut or
adjusted below because the backend doesn't expose the data/params they'd need yet — see the
"Cut from original scope" section at the bottom if those get added later.

## Tech Stack & Ports
- Next.js App Router (already set up in `src/app/`), TypeScript, React, no UI library.
- This is a single Next.js app — frontend and backend (`src/app/api/...`) run in the **same
  process, same port**. In dev that's `http://localhost:3000`; frontend fetch calls should use
  **relative paths** (`/api/assets`, not `http://localhost:3000/api/assets`) so this works
  unchanged in production regardless of what port/domain it's deployed behind.
- All `fetch()` calls must include `credentials: "include"` to send the session cookie, even
  though it's same-origin — Next.js won't attach cookies to `fetch` by default in all contexts.
- Do NOT modify anything under `src/app/api/` or `src/lib/` — backend is already built.
- Do NOT install new npm packages — use only what's in `package.json`.
- Use `"use client"` on any component using state/effects.
- Monetary values arrive as strings (Prisma Decimal) — parse before formatting.
- Dates arrive as ISO strings — format to human-readable.
- Soft-deleted assets are already filtered out server-side.

## Project structure (where to write files)
```
src/app/
  layout.tsx              # Root layout — nav sidebar, wraps all pages
  page.tsx                # Dashboard home
  globals.css
  login/page.tsx
  profile/page.tsx
  assets/
    page.tsx              # Asset list with filters + pagination
    new/page.tsx
    [id]/
      page.tsx             # Detail: info, assignment history, audit log
      edit/page.tsx
  assignments/
    page.tsx
    new/page.tsx
  users/
    page.tsx
    new/page.tsx
    [id]/page.tsx

src/components/            # new folder
  Sidebar.tsx  Header.tsx  DataTable.tsx  Modal.tsx  Toast.tsx
  Pagination.tsx  FilterBar.tsx  FormField.tsx
```

## API endpoints available (exact shapes — build only against these)

### Auth
```
POST /api/auth/login   body: { email, password }   → { user: { id, name, role, email } }
POST /api/auth/logout                               → { message }
GET  /api/auth/me                                   → { user: { id, name, role, email } } | 401
```

### Assets
```
GET /api/assets?companyCode=&locationId=&assetClassCode=&vendorCode=&search=&assignedUserId=&unassigned=&page=&limit=
  → { data: [{ assetId, assetNumber, description, serialNumber, apcValue, bookValue, quantity, currency,
               company: { companyCode, companyName },
               location: { locationId, locationName } | null,
               assetClass: { assetClassCode, description } | null,
               vendor: { vendorCode, vendorName } | null }], page, limit, total }
  # NOTE: list rows do NOT include currentHolder — see "Cut from original scope"

GET /api/assets/:id
  → { assetId, assetNumber, description, serialNumber, apcValue, bookValue, quantity, currency,
      capitalizedOn, acquisitionYear, warrantyExpiresOn, remarks, otherRemarks,
      company: { companyCode, companyName },
      location: { locationId, locationName, locationCode } | null,
      assetClass: { assetClassCode, description } | null,
      vendor: { vendorCode, vendorName } | null,
      currentHolder: { userId, fullName, email } | null }

POST /api/assets     body: { companyCode, assetNumber, description?, serialNumber?, assetClassCode?,
                              locationId?, vendorCode?, apcValue?, bookValue?, quantity?, ... }
PUT  /api/assets/:id    (full update, same body as POST)
PATCH /api/assets/:id   (partial update, same body shape)
DELETE /api/assets/:id  → 200 | 409 if assigned | 403 if not admin
```

### Lookup tables (dropdowns)
```
GET /api/companies       → { data: [{ companyCode, companyName }], total }
GET /api/locations       → { data: [{ locationId, locationName, companyCode }], total }  (?companyCode= filter)
GET /api/asset-classes   → { data: [{ assetClassCode, description }], total }
GET /api/vendors         → { data: [{ vendorCode, vendorName }], total }
```

### Users
```
GET /api/users            → { data: [{ userId, fullName, email, role, department }], total }
  # NOTE: no ?search= param, no assignedAssetCount field — see "Cut from original scope"
GET /api/users/:id        → { userId, fullName, email, role, department, assignments: [...] }
POST /api/users            body: { fullName, email, password, role?, department? }
PUT /api/users/:id         body: { fullName?, email?, role?, department? }
DELETE /api/users/:id      → 200 | 403 if not admin
```

### Assignments
```
GET /api/assignments?active=true&assetId=&userId=
  → { data: [{ assignmentId, assetId, userId, assignedOn, returnedOn, remarks,
               asset: { assetId, assetNumber, description },
               user: { userId, fullName } }], total }
  # NOTE: no ?search= param — see "Cut from original scope"

POST /api/assignments      body: { assetId, userId, notes? }
  → { assignmentId, assetId, userId, assignedOn, asset: {...}, user: {...} }

PATCH /api/assignments/:id/return   (no body)
  → { assignmentId, returnedOn, ... }
```

### Dashboard
```
GET /api/dashboard/summary         → { totalAssets, byCompany: [{ companyCode, companyName, count }],
                                        byClass: [{ assetClassCode, description, count }],
                                        unassignedCount, totalBookValue }
GET /api/dashboard/by-location     → [{ locationId, locationName, companyCode, companyName, count }]
GET /api/dashboard/recent-activity → [{ type: "assignment"|"return"|"asset_added", ...details }]
  # NOTE: no documented ?limit= — treat as returning a small fixed recent set; slice to 10 client-side for now
```

### Notifications
```
GET /api/notifications
  → { warrantyExpiring: [...], overdueReturns: [...], unassignedHighValue: [...] }
```

### Audit Log
```
GET /api/assets/:id/audit-log
  → [{ id, tableName, recordId, action, changedAt, changes, changer: { userId, fullName } }]
```

## Pages to build

### 1. Login (`/login`)
Email + password form. On success redirect to `/`. Show error on failure. If `GET /api/auth/me`
already succeeds on load, redirect straight to `/`.

### 2. Dashboard (`/`)
- Summary cards: Total Assets, Unassigned Count, Total Book Value (₹ formatted), Active Assignments
  (derive from `/api/assignments?active=true` total, or from summary if present).
- Notifications banner: warranty expiring, overdue returns, unassigned high-value — from `/api/notifications`.
- "Assets by Company" and "Assets by Class" tables/bars from `/api/dashboard/summary`.
- "Assets by Location" table from `/api/dashboard/by-location`.
- Recent Activity feed — take `/api/dashboard/recent-activity` and show up to 10 items.
- Notification cards and activity items link to the relevant asset/user page.

### 3. Asset List (`/assets`)
- Columns: Asset #, Description, Company, Location, Class, Book Value, Actions.
  (No "Assigned To" column — the list endpoint doesn't return `currentHolder`; that's only on
  the detail page. Use the `?unassigned=true` filter instead of a column if you need to surface
  assignment state in the list.)
- Filters: search text, Company dropdown, Location dropdown, Class dropdown, "Unassigned only" checkbox
  — all backed by real `GET /api/assets` params.
- Pagination: Prev/Next, "Page X of Y — Z total results".
- Row actions: View → `/assets/[id]`, Edit → `/assets/[id]/edit`, Delete (admin only, confirm first).
- "Add Asset" button → `/assets/new`.
- Book values as ₹ with Indian grouping (e.g. ₹1,23,456.00).

### 4. Create Asset (`/assets/new`)
Fields: Company* (dropdown), Asset Number*, Description, Serial Number, Asset Class (dropdown),
Location (dropdown, filtered by selected company), Vendor (dropdown), APC Value, Book Value,
Quantity (default 1), Capitalized On (date), Acquisition Year, Warranty Expires On (date),
Remarks, Other Remarks.
Validation: asset number + company required, quantity > 0, values ≥ 0, capitalizedOn not in future.
Submit → `POST /api/assets`, redirect to the new asset's detail page. Cancel → `/assets`.

### 5. Asset Detail (`/assets/[id]`)
- Header: Asset #, Description, Company badge, Current Holder (name + link to `/users/[id]`, or "Unassigned")
  — from the detail endpoint's `currentHolder`.
- Info grid: Location, Class, Vendor, Serial #, APC Value, Book Value, Quantity, Capitalized On,
  Acquisition Year, Warranty Expires On, Remarks.
- Actions: "Assign Asset" (if unassigned) → opens assign form pre-filled with this asset;
  "Return Asset" (if assigned) → confirm, then `PATCH /api/assignments/:id/return`;
  "Edit" → `/assets/[id]/edit`; "Delete" (admin only, confirm).
- Assignment History section: table from `GET /api/assignments?assetId=` (Assigned To, Assigned On,
  Returned On, Status, Remarks).
- Audit Log section: table from `GET /api/assets/:id/audit-log` (Date, User, Action, field-level diffs).

### 6. Edit Asset (`/assets/[id]/edit`)
Same fields as Create, pre-filled. Submit → `PUT /api/assets/:id`, redirect to detail. Cancel → detail page.

### 7. Assignments List (`/assignments`)
- Columns: Asset #, Description, Assigned To, Assigned On, Returned On, Status, Actions.
- Filters: "Active only" checkbox (default ON) using `?active=true`.
  (No text search box — the endpoint has no `?search=` param. If you need to find a specific
  assignment, filter by asset or user from their own detail pages instead.)
- Pagination.
- Row actions: "Return" (active rows only, confirm then `PATCH .../return`); links to asset and user pages.
- "Assign Asset" button → `/assignments/new`.

### 8. Assign Asset (`/assignments/new`)
Fields: Asset (searchable dropdown — fetch `?unassigned=true` from `/api/assets` to only list
available ones), User (dropdown from `/api/users`), Notes (optional).
Validation: both required. Submit → `POST /api/assignments`, redirect to assignment list or asset detail.
Handle 409 explicitly: show "Asset is currently assigned to {name}, return it first" from the error body.

### 9. Users List (`/users`)
- Columns: Name, Email, Role, Department, Actions.
  (No "Assigned Assets Count" column — the list endpoint doesn't return it, and adding it would mean
  N extra detail calls. If this is needed later, it belongs on the backend as a computed field.)
- No search box for the same reason as Assignments — no `?search=` param exists; page through the
  list instead, it's a 5–10 person team.
- Pagination.
- Row actions: View → `/users/[id]`; Edit (modal, `PUT /api/users/:id`); Delete (admin only, confirm).
- "Add User" button (admin only) → `/users/new`.

### 10. Create User (`/users/new`)
Fields: Full Name*, Email* (format validated), Password* (min 8 chars), Role (staff/admin — only
admin can pick admin), Department (optional).
Submit → `POST /api/users`, redirect to `/users`. Cancel → `/users`.

### 11. User Profile (`/users/[id]`)
- Header: name, role badge, email, department.
- Assigned Assets: from the `assignments` array in `GET /api/users/:id` — filter to active
  (no `returnedOn`) for "currently assigned"; show the rest as history in one combined table
  (Asset #, Description, Assigned On, Returned On, Status, Remarks). "Return" button on active rows.
- Edit (admin or self) → modal, `PUT /api/users/:id`. No password field here — the API doesn't
  expose a password-change endpoint yet.

### 12. Profile Page (`/profile`)
Same as User Profile but for the logged-in user (`GET /api/auth/me` → then `GET /api/users/:id`).
Hide the delete button (can't delete self). Edit own name/email/department only, no role field,
no password change (not supported by the backend yet).

## Design guidelines
- Sidebar (collapsible on mobile): Dashboard, Assets, Assignments, Users (admin only), My Profile.
- Header bar: user name + role badge + Logout.
- Tables: striped rows, client-side sort on header click, horizontal scroll on mobile.
- Forms: label above input, `*` on required fields, client-side validation, inline errors.
- Modals for quick actions (assign, return, delete confirm) — backdrop click or X to close.
- Toasts: green success / red error, top-right, auto-dismiss 3s.
- Loading states: skeleton/spinner while fetching; disable submit during POST/PUT.
- Empty states: "No assets found", "No assignments yet", etc.
- Color scheme: neutral/professional — blue primary, gray backgrounds, white cards, red for destructive actions.
- Currency: ₹ with Indian grouping, e.g. ₹1,23,456.00.
- Dates: "19 Jul 2026" format, not raw ISO.

## Auth flow
1. On app load, call `GET /api/auth/me`.
2. 401 → redirect to `/login`. 200 → store user in React context, render sidebar/header.
3. Every `fetch()` call includes `credentials: "include"`.
4. Logout → `POST /api/auth/logout`, redirect to `/login`.
5. Hide admin-only nav items/buttons for non-admin users (this is UI convenience only — the
   backend still enforces role checks server-side, don't treat hiding the button as security).

## Cut from original scope (backend doesn't support these yet — don't build the UI for them)
- Search-by-name/email on `/users` and search on `/assignments` — no `?search=` param on either endpoint.
- "Assigned Assets Count" column on the Users list — not returned by `GET /api/users`.
- "Assigned To" column on the Asset list — `currentHolder` is only on the single-asset detail endpoint.
- Password change from the Profile page — no endpoint exposes this.
If these get added to the backend later, the corresponding UI pieces described above (with NOTE
comments) can be added back in without restructuring anything else.