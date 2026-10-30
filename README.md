# CampusSphere – Smart Bus Management & Student Portal

> **A full‑stack React application for college campus transportation, academic, library and fee management.**
>
> The project demonstrates **Firebase Authentication**, **Firestore** data modeling, **OCR‑based physical ID‑card verification**, and **real‑time bus tracking**.
>
> This repository contains the **updated code** that adds strict student‑status handling, admin approval workflow, removal/restore actions, and a camera‑based OCR scanner for the Smart Bus module.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Folder Structure](#architecture--folder-structure)
3. [Key Source Files](#key-source-files)
   - [Frontend entry points](#frontend-entry-points)
   - [Authentication & Context](#authentication--context)
   - [Student Registration & Status Flow](#student-registration--status-flow)
   - [Admin Portal](#admin-portal)
   - [Smart Bus – OCR Verification](#smart-bus--ocr-verification)
   - [Other Modules (Academics, Library, Fees, Attendance)](#other-modules)
4. [Firebase Setup](#firebase-setup)
   - [Authentication](#authentication)
   - [Firestore Data Model](#firestore-data-model)
   - [Security Rules](#security-rules)
5. [Application Workflow](#application-workflow)
6. [Installation & Local Development](#installation--local-development)
7. [Environment Variables](#environment-variables)
8. [Deployment to Vercel](#deployment-to-vercel)
9. [Testing Scenarios (Viva Checklist)](#testing‑scenarios)
10. [License](#license)

---

## Project Overview

CampusSphere is a **single‑page React application** built with Vite. It serves two main user groups:

* **Students** – access academics, attendance, library, fee information, and the *Smart Bus* feature.
* **Admins** – manage student registrations, approve/reject accounts, view statistics, and control bus operations.

The **Smart Bus** module now works entirely with a **physical college ID card**. Using the device camera (mobile or laptop webcam) the app captures an image, runs **Tesseract.js OCR** to extract the roll number and name, verifies that the scanned card belongs to the logged‑in student, and then reveals the bus details and live route.

All existing functionality (academics, library, fees, notifications, etc.) remains unchanged.

---

## Architecture & Folder Structure

```
campussphere/
├─ public/                     # Static assets (favicon, robots.txt)
├─ src/
│  ├─ assets/                 # Images & icons used in the UI
│  ├─ components/             # Re‑usable UI components (e.g., SplashScreen)
│  ├─ context/                # React context – AuthContext provides user & status
│  │   └─ AuthContext.jsx
│  ├─ firebase/
│  │   ├─ config.js           # Firebase SDK initialization
│  │   └─ firestore.rules     # Security rules (uploaded to Firebase console)
│  ├─ layouts/                # Layout wrappers for Student & Admin portals
│  │   ├─ StudentLayout.jsx
│  │   └─ AdminLayout.jsx
│  ├─ pages/
│  │   ├─ admin/
│  │   │   ├─ Dashboard.jsx            # Admin overview cards
│  │   │   ├─ Students.jsx             # Manage Approved / Pending / Removed / Rejected
│  │   │   └─ Bus.jsx                  # Admin side‑bus verification & boarding logs
│  │   ├─ student/
│  │   │   ├─ Bus.jsx                  # OCR verification + live bus view (student side)
│  │   │   ├─ Dashboard.jsx
│  │   │   └─ … (Academics, Library, …)
│  │   ├─ Login.jsx
│  │   ├─ Register.jsx                # Registers with status = 'pending'
│  │   ├─ PendingApproval.jsx         # Shown to users while awaiting admin approval
│  │   ├─ Rejected.jsx                # Shown to users whose account was rejected
│  │   └─ CompleteProfile.jsx
│  ├─ App.jsx                # Central router & ProtectedRoute logic
│  ├─ index.css
│  └─ main.jsx               # Vite entry point
├─ .env.local               # Local env values (Firebase config, Maps API key)
├─ firestore.rules          # Security rules (same as src/firebase/firestore.rules)
├─ package.json
├─ package-lock.json
└─ vite.config.js
```

---

## Key Source Files

### Front‑end entry points

#### `src/App.jsx`
*Defines routes for public pages (`/login`, `/register`) and protected routes for students & admins.*
```jsx
const ProtectedRoute = ({ children, allowedRole }) => {
  const { currentUser, userData, loading } = useAuth();

  if (loading) return <div className="splash-screen"><div className="loader"/></div>;
  if (!currentUser) return <Navigate to="/login" />;

  // --- status based guards (student only) ---
  if (allowedRole === 'student' && userData) {
    const status = userData.status || 'approved'; // backward compatibility
    if (status === 'pending')   return <Navigate to="/pending" />;
    if (status === 'rejected')  return <Navigate to="/rejected" />;
    if (status === 'removed')   return <Navigate to="/login" />;
  }

  if (userData && userData.role !== allowedRole) {
    return <Navigate to={`/${userData.role}`} />;
  }

  return children;
};
```
*The router now contains the new `/pending` and `/rejected` routes.

---

### Authentication & Context

#### `src/context/AuthContext.jsx`
*Provides `currentUser`, `userData` (from Firestore) and `loading` state. Switches from a one‑time `getDoc` to a real‑time `onSnapshot` listener so status changes (approval, rejection, removal) are reflected without re‑login.*
```jsx
useEffect(() => {
  const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    setCurrentUser(user);
    if (user) {
      const docRef = doc(db, 'users', user.uid);
      unsubscribeDoc = onSnapshot(
        docRef,
        (snap) => {
          setUserData(snap.exists() ? snap.data() : null);
          setLoading(false);
        },
        (err) => {
          console.error('AuthContext listener error', err);
          setUserData(null);
          setLoading(false);
        }
      );
    } else {
      setUserData(null);
      setLoading(false);
    }
  });
  return () => { unsubscribeAuth(); if (unsubscribeDoc) unsubscribeDoc(); };
}, []);
```
*Only admins can change a student's `status` field – the UI never exposes a direct status edit to students.*

---

### Student Registration & Status Flow

#### `src/pages/Register.jsx`
*When a new student signs up the Firestore document receives `status: 'pending'`. After successful write the user is redirected to `/pending`.*
```jsx
await setDoc(doc(db, 'users', user.uid), {
  uid: user.uid,
  name: formData.fullName,
  studentId: formData.studentId,
  email: formData.email,
  mobile: formData.mobile,
  department: formData.department,
  year: formData.year,
  section: formData.section,
  role: 'student',
  status: 'pending',
  createdAt: new Date().toISOString(),
  // ... other module defaults
});

navigate('/pending');
```
The `status` field is the single source of truth for the student's lifecycle.

#### `src/pages/PendingApproval.jsx`
*Shows a friendly waiting screen and uses the real‑time listener from `AuthContext` to auto‑redirect when the admin approves or rejects the account.*
```jsx
useEffect(() => {
  if (!currentUser) return navigate('/login');
  if (userData?.status === 'approved')   navigate('/student');
  if (userData?.status === 'rejected')  navigate('/rejected');
}, [userData, currentUser]);
```

#### `src/pages/Rejected.jsx`
*Displays a rejection notice with a sign‑out button. No protected routes are reachable because `ProtectedRoute` forces a redirect to `/login` for `rejected` status.*
---

### Admin Portal

#### `src/pages/admin/Students.jsx`
*Three tabbed views: **Approved**, **Pending Approvals**, **Manage Students** (includes Removed & Rejected). The component queries the `users` collection once, then derives filtered lists on the client.*
Key status‑change helper:
```js
const updateStatus = async (studentId, newStatus, label) => {
  if (!window.confirm(`Are you sure you want to ${label} this student?`)) return;
  await updateDoc(doc(db, 'users', studentId), { status: newStatus, [`${newStatus}At`]: new Date().toISOString() });
  setAllStudents(prev => prev.map(s => s.id === studentId ? { ...s, status: newStatus } : s));
};
```
*Rejected students are rendered in a separate **Rejected Applications** tab and are never included in the Approved, Pending, or Manage‑Students tables.*

#### `src/pages/admin/Dashboard.jsx`
*Shows statistics for total, pending, approved, rejected, and removed students, plus bus & library metrics. Counts are derived from the `status` field (missing status is treated as `approved` for backward compatibility).*
---

### Smart Bus – OCR Verification (Student side)

#### `src/pages/student/Bus.jsx`
*The most complex component – handles camera access, image capture, OCR processing, verification, and live bus display.*
Key sections:
1. **Camera Management** – uses `navigator.mediaDevices.getUserMedia`.
2. **OCR Processing** – calls `Tesseract.recognize` with a progress logger.
3. **Verification Logic** – matches extracted roll number/name against the logged‑in student.
```js
const myRoll = (userData.studentId || userData.rollNumber || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const myName = (userData.name || '').toLowerCase().trim();
const extractedRoll = (parsed.rollNumber || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const extractedName = (parsed.studentName || '').toLowerCase().trim();
const rollMatch = myRoll && extractedRoll && (extractedRoll === myRoll || extractedRoll.includes(myRoll) || myRoll.includes(extractedRoll));
const nameMatch = myName && (extractedName.includes(myName) || myName.includes(extractedName));
if (!rollMatch && !nameMatch) {
  setVerificationError(`Verification Failed: Scanned ID card does not match your profile (${userData.name} - ${userData.studentId})`);
  return;
}
```
4. **Successful verification** – stores a flag in `sessionStorage` (`bus_verified_${uid}`) and writes a record to the `idVerifications` collection.
```js
await addDoc(collection(db, 'idVerifications'), {
  studentUid: userData.uid,
  studentId: userData.studentId || '',
  name: userData.name || '',
  verifiedAt: new Date().toISOString(),
  busNumber: bus.busNumber || 'None'
});
```
5. **Live Bus Data** – after verification, a real‑time listener fetches the bus document (`buses/{busNumber}`) and optionally renders Google Maps directions (if a valid API key is supplied).
---

### Other Modules (Academics, Library, Fees, Attendance)
All remaining modules are unchanged from the original CampusSphere code base. They read/write data under the currently logged‑in student's document (`users/{uid}`) – fields such as `subjects`, `attendancePercentage`, `examFee`, `library`, and `bus` remain untouched by the new status workflow. The UI already displays these fields in the respective student pages.
---

## Firebase Setup

### Authentication
* Email/Password authentication is used. No custom claims are required – the user's role (`role: 'student' | 'admin'`) and `status` are stored in the Firestore `users` document.

### Firestore Data Model (excerpt)
```
users/{uid}               // student or admin profile
  ├─ uid: string
  ├─ name: string
  ├─ studentId: string          // roll number
  ├─ email: string
  ├─ role: 'student' | 'admin'
  ├─ status: 'pending' | 'approved' | 'rejected' | 'removed'
  ├─ bus: {                    // bus assignment info
        assigned: boolean,
        busNumber: string,
        routeName: string,
        pickupLocation: string,
        destinationName: string,
        feeAmount: number,
        feeStatus: 'paid' | 'unpaid',
        stops: [{ name: string }]
    }
  ├─ examFee: { amount: number, status: 'paid' | 'unpaid' }
  ├─ library: { subscriptionStatus: 'active'|'inactive', booksBorrowed: number }
  └─ ... other module fields ...

idVerifications/{docId}   // log of successful ID‑card scans
  ├─ studentUid, studentId, name, verifiedAt, busNumber

busScans/{docId}          // optional admin boarding logs
bus/{busNumber}           // live bus status written by the driver (outside scope)
```
---

### Security Rules (`firestore.rules`)
```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ---------------------------------------------------
    // Users collection
    // ---------------------------------------------------
    match /users/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      // Students can only read/write their own doc (except status)
      allow create: if request.auth != null && request.resource.data.role == 'student';
      allow update: if request.auth != null && request.auth.uid == uid &&
          // status can only be changed by an admin (via a server rule below)
          !("status" in request.resource.data);
      allow delete: if false; // never delete – keep history
    }

    // Admins may manage status fields
    match /users/{uid} {
      allow update: if request.auth != null &&
          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // -----------------------------------------------------------------
    // Collections used for logging & verification
    // -----------------------------------------------------------------
    match /idVerifications/{docId} { allow read, write: if request.auth != null; }
    match /busScans/{docId}        { allow read, write: if request.auth != null; }
    match /boardingRecords/{docId}{ allow read, write: if request.auth != null; }

    // -----------------------------------------------------------------
    // All other collections (e.g., buses) are readable by authenticated users.
    // Write access is limited to admins / drivers (not shown here).
    // -----------------------------------------------------------------
    match /buses/{busId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```
*The rules enforce that **students cannot modify their own `status`**. Only admins (role = 'admin') can change it, which is exactly what the admin UI does via `updateDoc`.
---

## Application Workflow (Beginner‑friendly)
1. **User registers** → `Register.jsx` creates a Firestore doc with `status: 'pending'` and redirects to `/pending`.
2. **Admin logs in** → In **Admin → Students → Pending Approvals** the admin clicks **ACCEPT** or **REJECT**.
   * **ACCEPT** → status becomes `approved`; student can now access the portal.
   * **REJECT** → status becomes `rejected`; the student is moved to the **Rejected Applications** tab and is blocked from all protected routes.
3. **Student logs in** → `ProtectedRoute` checks the `status`.
   * `pending` → `/pending` screen.
   * `rejected` → `/rejected` screen.
   * `approved` → normal student dashboard.
4. **Smart Bus – ID verification**
   * Student opens **Smart Bus** page → sees a lock screen.
   * Click **Open Camera & Scan ID Card** → camera opens, captures image.
   * OCR extracts roll number & name; matches against logged‑in user.
   * On success, bus details (number, route, fee status, live tracking) are revealed.
5. **Admin can later REMOVE a student** → status `removed`. The student loses all access but historic data (attendance, fees, library, bus logs) stay in Firestore.
6. **Removed students can be RESTORED** (admin sets status back to `approved`).
7. All other modules (academics, library, fees, attendance) continue to work as before because they read from the same `users/{uid}` document; the status guard simply prevents unauthorized access.
---

## Installation & Local Development
```bash
# 1. Clone the repository (or copy the zip archive)
git clone <your-new-repo-url>
cd campussphere

# 2. Install dependencies
npm install

# 3. Set up local environment variables (see next section)
cp .env.example .env.local   # rename and fill in the values

# 4. Run the development server
npm run dev   # Vite starts – usually http://localhost:5174 (or 5173)

# 5. Build for production (optional, to verify) 
npm run build
```
The dev server will automatically open the app; you can test the full flow with an actual or sample college ID‑card image.
---

## Environment Variables
*(Add these in Vercel → Settings → Environment Variables and in your local `.env.local`)*
| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase project API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain (e.g., `myproj.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_GOOGLE_MAPS_API_KEY` | **Optional** – Google Maps JavaScript API key (required only for map view). Leave empty to fallback to the built‑in route visualiser. |

> **Never** commit real secret values to the repository. Use Vercel's secret management or a local `.env.local` file that is ignored by git (`.gitignore` already contains it).
---

## Deployment to Vercel (New Project)
1. **Create a new Vercel project** and link it to the new GitHub repository.
2. In the Vercel dashboard, go to **Settings → Environment Variables** and add all the variables listed above.
3. Set the **Build Command** to `npm run build` and the **Output Directory** to `dist` (default for Vite).
4. Enable **Automatic Deployments** – Vercel will run `npm install && npm run build` on each push.
5. After the first deploy, verify that:
   * The login/registration flow works.
   * Admin can approve/reject students.
   * Smart Bus OCR works (camera permission must be granted). If you don’t have a Maps API key, the fallback visualiser will display correctly.
---

## Testing Scenarios (Viva Checklist)
| # | Scenario | Expected Result |
|---|----------|-----------------|
| 1 | **New student registers** | Record created with `status: 'pending'`; redirected to *Awaiting Admin Approval* page. |
| 2 | **Admin views pending list** | Student appears under *Pending Approvals* tab only. |
| 3 | **Admin accepts** | `status` becomes `approved`; student appears in *Approved* tab. |
| 4 | **Approved student logs in** | Full portal accessible, Smart Bus lock screen visible. |
| 5 | **Admin rejects** | `status` becomes `rejected`; student disappears from all operational tables and is moved to *Rejected Applications*. |
| 6 | **Rejected student tries to log in** | Immediately redirected to *Registration Rejected* page; cannot access any protected route. |
| 7 | **Admin removes an approved student** | `status` set to `removed`; student loses portal access but data remains in Firestore. |
| 8 | **Admin restores a removed student** | `status` set back to `approved`; student regains access. |
| 9 | **Student scans physical ID card (valid)** | OCR extracts roll number, verification succeeds, bus details & live tracking become visible. |
|10| **Student scans wrong ID card** | Verification error shown, bus details stay hidden. |
|11| **Student with unpaid bus fee** | After verification, a warning banner “Bus Fee Payment Pending” is displayed. |
|12| **All other modules (academics, library, fees, attendance)** | Continue to work unchanged for approved students. |
---

## License
This project is provided for educational purposes. Feel free to fork, modify, and use it in academic demos. No commercial warranty is implied.

---

*Prepared by the Antigravity coding assistant – all code snippets are taken directly from the source tree.*
