# VPortal - App Portal

A production-ready internal App Portal built with Next.js, Firebase, and Tailwind CSS. Users can discover, launch, and favorite applications. Admins have a dedicated portal to manage apps, categories, and users.

## Features

### User Features
- 🔐 **Authentication**: Email/Password + Google Sign-In
- 🔍 **Search & Filter**: Find apps by name, description, or tags
- 📂 **Categories**: Filter apps by category
- ⭐ **Favorites**: Mark apps as favorites for quick access
- 🕒 **Recent Apps**: Track recently opened applications
- 🚀 **Quick Launch**: Open apps in new tabs with one click

### Admin Features
- 📱 **App Management**: Full CRUD for applications
- 🏷️ **Category Management**: Organize apps into categories
- 👥 **User Management**: Promote/demote admin roles
- ⚙️ **Global Settings**: Configure portal name and logo
- 🌱 **Data Seeding**: One-click sample data generation

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v3 + shadcn/ui
- **Authentication**: Firebase Auth
- **Database**: Cloud Firestore
- **Validation**: Zod
- **Icons**: Lucide React

## Prerequisites

- Node.js 18+ and npm
- Firebase Project with:
  - Authentication (Email/Password + Google)
  - Cloud Firestore
  - Firebase Admin SDK credentials

## Firebase Setup

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the wizard
3. Enable Google Analytics (optional)

### 2. Enable Authentication
1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Enable **Email/Password**
3. Enable **Google** (optional)

### 3. Create Firestore Database
1. Go to **Firestore Database** → **Create database**
2. Start in **production mode** (we'll deploy rules later)
3. Choose a location close to your users

### 4. Get Firebase Config (Client)
1. Go to **Project Settings** → **General**
2. Scroll to "Your apps" → Click **Web** icon (`</>`)
3. Register app with nickname (e.g., "VPortal Web")
4. Copy the `firebaseConfig` object values

### 5. Get Firebase Admin SDK Credentials
1. Go to **Project Settings** → **Service accounts**
2. Click **Generate new private key**
3. Save the JSON file securely
4. Extract these values:
   - `project_id` → `FIREBASE_ADMIN_PROJECT_ID`
   - `client_email` → `FIREBASE_ADMIN_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_ADMIN_PRIVATE_KEY`

## Local Development Setup

### 1. Clone and Install
```bash
git clone <your-repo>
cd vportal
npm install
```

### 2. Configure Environment Variables
Create `.env.local` in the project root:

```env
# Firebase Client Config (from step 4 above)
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Firebase Admin SDK (from step 5 above)
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"

# Admin Bootstrap
ADMIN_EMAIL=your-email@example.com
```

> **Important**: For `FIREBASE_ADMIN_PRIVATE_KEY`, keep the quotes and preserve `\n` newline characters.

### 3. Deploy Firestore Security Rules
```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in project (select Firestore only)
firebase init firestore

# Deploy rules
firebase deploy --only firestore:rules
```

The `firestore.rules` file is already configured with proper security:
- Users can read active apps/categories
- Only admins can write apps/categories/settings
- Users can only write to their own favorites/recent

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## First-Time Setup

### 1. Create Admin Account
1. Navigate to `/login`
2. Sign up with the email matching `ADMIN_EMAIL` from `.env.local`
3. You'll be automatically granted admin role

### 2. Seed Sample Data
1. Navigate to `/admin`
2. Click **"Seed Initial Data"** button
3. This creates sample categories (Productivity, Development, Finance, HR) and apps (Jira, Slack, GitHub, Workday)

## Usage

### For Users
1. **Login**: Use email/password or Google Sign-In
2. **Browse Apps**: View all available apps on the dashboard
3. **Search**: Type in the search box to filter by name/description/tags
4. **Filter**: Click category badges to filter by category
5. **Favorite**: Click the heart icon to add/remove favorites
6. **Launch**: Click "Open" to launch an app (opens in new tab)

### For Admins
1. **Access Admin Portal**: Navigate to `/admin` or click "Exit to Dashboard" link
2. **Manage Apps**:
   - Add new apps with name, URL, description, icon, category, and tags
   - Edit existing apps
   - Toggle active/inactive status
   - Delete apps
3. **Manage Categories**:
   - Create categories with custom sort order
   - Edit category names
   - Toggle active/inactive
4. **Manage Users**:
   - View all registered users
   - Promote users to Admin role
   - Demote admins to User role
5. **Configure Settings**:
   - Set portal name
   - Configure logo URL

## Security

### Server-Side Enforcement
All admin operations are protected with server-side token verification:
- Server Actions verify Firebase ID tokens using Admin SDK
- Role checks ensure only users with `role: "ADMIN"` can perform admin operations
- Client-side checks are for UX only; security is enforced server-side

### Firestore Rules
The `firestore.rules` file enforces:
- Authentication required for all reads
- Admin-only writes for apps, categories, and settings
- Users can only modify their own favorites and recent apps

## Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add all environment variables from `.env.local`
4. Deploy

### Other Platforms
Ensure the platform supports:
- Node.js 18+
- Environment variables
- Server-side rendering (SSR)

## Firestore Data Structure

```
users/{uid}
  ├─ email: string
  ├─ role: "USER" | "ADMIN"
  ├─ createdAt: string
  ├─ favorites/{appId}
  │   └─ createdAt: string
  └─ recent/{appId}
      └─ lastOpenedAt: string

apps/{id}
  ├─ name: string
  ├─ url: string
  ├─ description?: string
  ├─ iconUrl?: string
  ├─ categoryId: string
  ├─ tags: string[]
  ├─ isActive: boolean
  ├─ createdAt: string
  └─ updatedAt: string

categories/{id}
  ├─ name: string
  ├─ sortOrder: number
  └─ isActive: boolean

settings/global
  ├─ portalName: string
  └─ logoUrl?: string
```

## Troubleshooting

### Build Errors
- **Missing environment variables**: Ensure all variables in `.env.local` are set
- **Firebase Admin SDK errors**: Check that `FIREBASE_ADMIN_PRIVATE_KEY` has proper formatting with `\n` characters

### Authentication Issues
- **Can't sign in**: Verify Email/Password is enabled in Firebase Console
- **Google Sign-In fails**: Ensure Google provider is enabled and configured

### Admin Access
- **Can't access /admin**: Verify your email matches `ADMIN_EMAIL` and you've logged in at least once
- **Role not updating**: Check Firestore `users/{uid}` document has `role: "ADMIN"`

## License

MIT
