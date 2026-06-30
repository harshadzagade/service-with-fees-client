# MET Registrar Services & Academic Portal - Frontend

This is the interactive frontend application for the MET Registrar Services & Academic Portal. It provides students, verification agencies, and registrar administrators with a secure, responsive, and high-performance portal built on React, Vite, and Vanilla CSS.

---

## 🎨 Design System & Aesthetics
- **Main Brand Red (`#ED1C24`):** Used exclusively for high-visibility CTAs (e.g., "Apply Now", "Pay & Apply", "Login") to align with MET's brand identity.
- **Deep Royal Navy Blue (`#0B3384`):** Used for navigation tabs, headings, card details, status highlights, and grand totals to establish a neat visual hierarchy.
- **Custom Brand Gradients:**
  - `--gradient-brand`: Vibrant Red to Royal Blue transition (used for main headers).
  - `--gradient-soft`: Soft Pink-Red to Soft Navy-Grey transition (used for summary widgets).
- **Responsive Layout:** Ellipsis-truncated dropdown menus for long academic programs and responsive grid cards.

---

## ⚡ Key Capabilities & Scoped Access

### 1. Student Portal (`/`)
- Dynamic select search to filter academic services and categories.
- Automatic tax breakdown calculations (including 18% CGST + SGST logic, exemptions, and round-offs).
- File upload integration with direct single-service checkout paths.
- **Note:** The "Educational Verification" service is sandboxed and excluded from this view.

### 2. Verify Credentials Portal (`/verify`)
- Dedicated entrance for background screening agencies and verifiers.
- **Deep Linking Support:** Accessing `/verify?institute=IOM` automatically loads the *Institute of Management* and **auto-opens the Educational Verification form** on screen.
- Sandboxed catalog displaying **only** the Educational Verification request form. All other student services are hidden.

### 3. Registrar Admin Dashboard (`/admin/login`)
- **Hidden Entry Point:** The "Admin Login" tab is completely hidden from the public header menu. Admins must access it via `/admin/login`.
- **Applications Tracking & Auditing:** View paid and fulfilled application lists.
- **Advanced Filtering Row:** Filter records instantly by MET College (Superadmin scope), Service name, Program Type, and Submission Date (Today, This Week, This Month).
- **Export CSV:** Downloads the dynamically *filtered* applications array.
- **Master Data Configuration:** CRUD panels for MET Colleges, Academic Programmes, Registrar Services, and Admin Users.

---

## 🚀 Getting Started

### 1. Installation
Install the project dependencies:
```bash
npm install
```

### 2. Running in Development
Start the local development server:
```bash
npm run dev
```
The server usually runs on `http://localhost:5173`.

### 3. Compiling for Production
Compile the optimized production bundle:
```bash
npm run build
```

---

## 📦 Directory Structure
- `src/App.jsx` - Main application controller with pathname routing and History API URL synchronization.
- `src/components/Header.jsx` - Header navigation gateway with dynamic admin session states.
- `src/pages/`
  - `StudentPortal.jsx` - Core registrar application portal, dynamic fee widget, and Educational Verification layout.
  - `AdminDashboard.jsx` - Admin panel containing advanced filters, CSV export, audit visualizer, and CRUD sections.
  - `Cart.jsx` - Pending requests review page.
  - `Checkout.jsx` - PayU checkout form redirection handler.
- `src/utils/` - API client configurations and client-side fee engines.
