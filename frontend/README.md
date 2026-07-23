# 💻 InsightOS — Frontend Application

This folder contains the **React + TypeScript + Vite** web interface for **InsightOS** (Automated EDA and Pattern Discovery Platform).

---

## 🚀 How to Open and Run the Application

### 1. Make Sure the Backend Server is Running
The frontend connects to the backend FastAPI server on `http://localhost:8000`. Before or alongside running the frontend:

```bash
cd ../backend
pip install -r requirements.txt
python main.py
```

### 2. Install Frontend Dependencies
From the `frontend` folder, run:

```bash
npm install
```

### 3. Start the Development Server
```bash
npm run dev
```

### 4. Open in Browser
Click or navigate to the URL shown in your terminal output:
👉 **[http://localhost:5173](http://localhost:5173)**

---

## 🛠️ Available Scripts

- **`npm run dev`**: Launches local Vite development server with HMR.
- **`npm run build`**: Type-checks TypeScript code and compiles static production bundle to `dist/`.
- **`npm run preview`**: Previews the built production site locally.
- **`npm run lint`**: Runs Oxlint code linter.

---

## 📦 Tech Stack

- **Framework:** React 19 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS + Lucide Icons + Framer Motion
- **UI Components:** Radix UI Primitives
- **Charts & Graphs:** Recharts
- **State Management:** Zustand
