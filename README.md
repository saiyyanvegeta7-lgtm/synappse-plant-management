# Synapse Plant Management System

A high-performance, polished, and fully responsive **Plant Management & Operations Hub** designed for modern industrial engineering. It features an automated multi-level approval workflow, real-time database tracking, preventive maintenance tracking, asset reliability logs, and a dynamic database synchronization hub.

The application is built as a highly optimized client-side React SPA powered by **Vite**, **Tailwind CSS**, and **Framer Motion**, utilizing **Firebase Firestore** for persistent cloud storage and **Google Sheets + Webhook integration** for real-time operation logging.

---

## 🚀 Rapid Deployment to GitHub Pages

Our repository is pre-configured with a zero-config GitHub Actions deployment pipeline (`.github/workflows/deploy.yml`). Follow these simple steps to host this app live under your own web domain or GitHub URL in under 5 minutes:

### Step 1: Create a GitHub Repository
1. Log in to your personal [GitHub account](https://github.com).
2. Create a new empty repository (e.g., `synapse-plant-management`). Keep it public or private as preferred. Do **not** initialize it with a README or gitignore.

### Step 2: Push the Code from this Workspace
Download the ZIP archive of this project (from the top-right Settings menu inside AI Studio) or utilize your terminal to push the codebase:
```bash
# Initialize git repository
git init

# Link to your newly created GitHub repository
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git

# Stage and commit all files (including pre-configured configs and workflows)
git add .
git commit -m "feat: initial release of Synapse Plant Management"

# Rename current branch to main and push
git branch -M main
git push -u origin main
```

### Step 3: Enable GitHub Pages in Repository Settings
1. On GitHub, navigate to your repository's page and select **Settings** (clog icon).
2. In the left-hand navigation sidebar, click on **Pages**.
3. Under the **Build and deployment** section, look for **Source**.
4. Change the dropdown selection from *"Deploy from a branch"* to **"GitHub Actions"**.
5. *That's it!* Navigate to the **Actions** tab on your repository to watch the automated build and deployment complete. In a minute, your public URL will be visible (formatted as `https://<your-username>.github.io/<your-repo-name>/`).

---

## 🛠️ Configuring Your Live Databases & Integrations

The system is highly flexible and will run immediately out-of-the-box using the pre-configured Firebase project settings. However, to transition to a permanent production instance or use a custom Google ecosystem, consult the configuration details below:

### 🗄️ 1. Custom Firebase Project Setup (Recommended is Optional)
If you wish to host the data on your own Google Firebase Firestore/Auth accounts instead of the sandboxed instance, simply set these environment variables in your deployment dashboard (e.g., Vercel, Netlify) or create a local `.env` file in your repository:

```env
VITE_FIREBASE_API_KEY=your_custom_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_custom_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_custom_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_custom_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_FIRESTORE_DATABASE_ID=default
```

*Note: If no custom environment variables are provided, the application will transparently fall back to the secure local config stored inside `firebase-applet-config.json`.*

### 📊 2. Secure Google Sheets Integration
The app lets users sync data directly with a central master spreadsheet:
1. Log in using your Google Account inside the application's **Database Hub**.
2. Click **Provision Master Sheet** or select an existing worksheet directly from your Google Drive.
3. The app will securely append all registered plant requests, machine breakdowns, and client enquiries as clean tabular rows automatically.

### 📧 3. Immediate E-mail Approver Webhooks (SMS & Mail Notifications)
To configure instant email/SMS webhooks matching your plant workflow:
1. Copy the Google Apps Script code displayed under **Database Hub -> Workflow Web App**.
2. Deploy this script inside Google Extensions as a **"Web App"** with *"Execute as me"* and accessibility set to *"Anyone"*.
3. Copy the resulting URL and paste it under the **Workflow URL** tab in the app's Database Hub.
4. From that point on, whenever a requester logs a new ticket, the Level 1 approver will instantly receive an email notify action with interactive response links!

---

## 💻 Local Development Workflow

To run and edit this application on your local workstation:

1. **Install Node.js & Dependencies**:
   Ensure Node.js v18+ is installed, then run:
   ```bash
   npm install
   ```

2. **Launch the Development Server**:
   Start the hot-reloading development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` inside your browser.

3. **Validate & Compile production bundles**:
   To catch potential typescript errors and compile highly optimized static assets:
   ```bash
   # Type check
   npm run lint
   
   # Build optimized static files
   npm run build
   ```
   Outputs will be cleanly generated in the `/dist` directory, fully ready for distribution on any CD network.

---

## 🎨 Architecture & Styling Matrix

Our architecture emphasizes high-end industrial engineering aesthetic:
- **Core Framework**: React 19 (Functional Components, Custom Hooks, Context State)
- **Engine Build**: Vite 6 (Fast, modern bundling)
- **Responsive Theme**: Tailwind CSS 4 with fully synchronized responsive prefixes and active typography scales.
- **Interactions**: Fluid spring animations and staggered layout transitions powered by **Framer Motion** (`motion`).
- **Icons**: Sourced from the clean, vector-based SVG collection of `lucide-react`.
