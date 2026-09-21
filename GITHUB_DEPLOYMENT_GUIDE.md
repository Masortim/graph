# 🚀 Linear Algebra NSU — GitHub Deployment & Role Workflow Guide (v2.4.0)

**Linear Algebra NSU (Interactive Concept & Dependency Graph)** is a modern, high-performance web application designed for interactive study, visualization, and maintenance of the Linear Algebra course at Novosibirsk State University.

---

## 📁 1. Repository Architecture & Directory Structure

```text
linear-algebra-nsu-graph/
├── .github/
│   └── workflows/
│       └── deploy.yml             # Automatic GitHub Pages CI/CD deployment
├── ActualGraph/                   # Master Graph repository storage
│   └── graph.json                 # Core Master Graph JSON file
├── AssistantProposals/            # Storage for Assistant Pull Requests & proposals
│   ├── README.md
│   └── assistant_proposal_*.json  # Proposals submitted by teaching assistants
├── public/
│   ├── ActualGraph/
│   │   └── graph.json             # Static graph loaded automatically on startup
│   └── favicon.svg
├── src/
│   ├── components/                # React UI components (GraphCanvas, Toolbar, etc.)
│   ├── utils/                     # Graph algorithms, FA2 physics, SVG exporter, LaTeX parser
│   ├── types/                     # TypeScript schemas (GraphNode, GraphEdge, Proposal)
│   └── data/                      # Fallback demo vault
├── package.json                   # Version 2.4.0 configuration & dependencies
├── vite.config.ts                 # Vite bundler configuration
└── README.md
```

---

## 🌐 2. Dedicated URLs & Role-Based Access

The application automatically configures itself based on the URL hash or query parameters:

| Role | Access URL | Features & Permissions |
| :--- | :--- | :--- |
| **Студент (Student View)** | `https://<user>.github.io/<repo>/#/viewer`<br/>*or* `?mode=student` | • Minimalist clean study layout.<br/>• Double-click LMB pinning of LaTeX badges on canvas.<br/>• Right-click (RMB) local graph exploration (depth 1 & 2).<br/>• Real-time KaTeX formula & keyword search.<br/>• Vector SVG export with official diagonal repeating watermark.<br/>• Editing tools and code downloads are disabled. |
| **Помощник (Assistant View)** | `https://<user>.github.io/<repo>/#/assistant`<br/>*or* `?mode=assistant` | • Load and view the latest Master Graph.<br/>• Add new nodes connected by 1 edge to existing nodes.<br/>• Attach and edit rich bilingual cards ($LaTeX$, badges).<br/>• Add deletion/merge recommendations in edge badges.<br/>• Export named proposal JSON (`assistant_proposal_<Name>_<Date>.json`).<br/>• Cannot directly delete core base nodes or edges. |
| **Автор / Преподаватель (Author View)** | `https://<user>.github.io/<repo>/#/author`<br/>*or* `https://<user>.github.io/<repo>/` | • Full administrative and creative graph suite.<br/>• Direct node and edge creation, editing, merging, unmerging.<br/>• "Проверить правки" button to review assistant proposals.<br/>• Draggable interactive review log with camera focus.<br/>• One-click export to `ActualGraph/graph.json`. |

---

## 🛠️ 3. Step-by-Step Workflows

### 👩‍🎓 A. Student Workflow
1. Open `https://<user>.github.io/<repo>/#/viewer`.
2. **Explore the Graph:** 
   - Drag with **Right Mouse Button (RMB)** to pan smoothly around the canvas.
   - Use the mouse wheel or bottom-right zoom widget to zoom in/out.
3. **Study Concepts & Proofs:**
   - **Double-click LMB** on any node or edge to open and pin its mathematical card on the graph.
   - Cards support full LaTeX rendering ($\mathbb{R}^n$, $\det(A - \lambda I) = 0$, $A = U \Sigma V^T$).
4. **Isolate Local Subgraphs:**
   - **Click RMB** on any concept to view its local neighborhood (Depth 1 or Depth 2).
5. **Search:**
   - Type in the top search bar (in English, Chinese, or formula terms) to highlight relevant structures.
6. **Export Diagram:**
   - Click the **SVG button** in the bottom-right corner to download a publication-ready vector image with the diagonal watermark:
     ```text
     LINEAR ALGEBRA
     NOVOSIBIRSK STATE UNIVERSITY
     © KORIAKIN R.A. @ULYANOV A.P.
     © ALL RIGHTS RESERVED
     ```

---

### 👨‍🏫 B. Teaching Assistant Workflow
1. Open `https://<user>.github.io/<repo>/#/assistant`.
2. **Add New Concept Nodes:**
   - Select an existing base node and click **«+ Создать узел и связать»**.
   - Provide English & Chinese titles, color, and attach an informational note with KaTeX formulas and badges ($\text{🟨 🟦 🟩}$).
3. **Suggest Improvements & Edge Deletions:**
   - Double-click RMB on an edge to open its settings and write deletion hints (e.g. `🟨 Рекомендуется удалить связь / merge`).
4. **Export Your Proposal:**
   - Click **«Сохранить правки (.json)»** in the top toolbar.
   - Enter your name/nickname and optional notes.
   - A file named `assistant_proposal_<YourName>_<Date>.json` will be downloaded.
5. **Submit to GitHub:**
   - Open a Pull Request placing the file into the `AssistantProposals/` directory of the GitHub repository.

---

### 🧑‍💼 C. Master Author / Professor Workflow
1. Open `https://<user>.github.io/<repo>/` (or `#/author`).
2. **Review Assistant Proposals:**
   - Click the **«Проверить правки»** button in the toolbar.
   - Select the assistant's `assistant_proposal_*.json` file.
   - The app merges the proposed additions and activates the **Dropdown Chevron**.
3. **Inspect Changes via Floating Window:**
   - Click the Chevron to open the movable, draggable **Лог правок помощника**.
   - Click on any item in the checklist to automatically **pan the camera** and focus on that node or edge.
   - Click the checkbox `[✓]` to mark each item as reviewed (reviewed items are shaded/dimmed).
4. **Save Master Graph:**
   - Click **«Сохранить»** in the toolbar to download `graph.json`.
   - Place this file in `public/ActualGraph/graph.json` (and `ActualGraph/graph.json`) and commit to GitHub.

---

## ⚡ 4. Local Development & Build Commands

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Quick Start
```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/linear-algebra-nsu-graph.git
cd linear-algebra-nsu-graph

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```
Open `http://localhost:5173/` in your browser.

### Production Build
```bash
npm run build
```
The optimized static production files will be built into the `dist/` directory.

---

## 🚀 5. Deploying to GitHub Pages (Automatic CI/CD)

The repository includes a GitHub Actions workflow `.github/workflows/deploy.yml`.

### Setup in 3 Easy Steps:
1. Push this repository to GitHub.
2. In your repository on GitHub, go to **Settings** → **Pages**.
3. Under **Build and deployment** → **Source**, select **GitHub Actions**.

Every time you commit changes to the `main` branch (including updating `public/ActualGraph/graph.json`), GitHub Actions will automatically rebuild and deploy the site!

---

## 📜 Copyright & Authors
- **Course**: Linear Algebra & Matrix Analysis, Novosibirsk State University (NSU)
- **Authors**: © Koriakin R.A., @Ulyanov A.P.
- **System Version**: v2.4.0 (GitHub Ready)
- **All Rights Reserved**.
