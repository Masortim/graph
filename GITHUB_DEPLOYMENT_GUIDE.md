# 🚀 Linear Algebra NSU — GitHub Deployment & Role Workflow Guide

**Linear Algebra NSU (Interactive Concept & Dependency Graph)** is a modern, high-performance web application designed for interactive study, visualization, and maintenance of the Linear Algebra course at Novosibirsk State University.

---

## 📁 1. Two Packages & Architecture

### A. Web Version for GitHub Pages (`github_linear_algebra_v1_0.zip`)
Designed specifically for public hosting on GitHub Pages:
- **Student View** at `/#/viewer` (or root `/` for view-only).
- **Assistant View** at `/#/assistant` (works in the browser without GitHub account).
- **No Author Mode** (protects course graph from unauthorized edits online).
- Master graph file located at `ActualGraph/graph.json` and `public/ActualGraph/graph.json`.
- Proposals stored in `Proposals/`.

### B. Local Offline Suite for the Author (`linear_algebra_nsu_graph_v2_4.zip`)
Designed for the course author/professor to run locally:
- Full Author Suite with direct editing, merge, split, physics simulation.
- **«Проверить правки»** review button with floating checklist and camera auto-focus on proposed elements.
- Local export of `graph.json` to be copied into the GitHub repo's `ActualGraph/graph.json`.

---

## 🌐 2. Dedicated Web URLs & Role-Based Access

| Role | Access URL | Features & Permissions |
| :--- | :--- | :--- |
| **Студент (Student View)** | `https://<user>.github.io/<repo>/#/viewer` | • Interactive pan/zoom and node exploration.<br/>• Double-click LMB pinning of LaTeX badges on canvas.<br/>• Right-click (RMB) local graph exploration (depth 1 & 2).<br/>• Real-time KaTeX formula & bilingual search.<br/>• Vector SVG export with official diagonal watermark.<br/>• Editing and graph manipulation disabled. |
| **Помощник (Assistant View)** | `https://<user>.github.io/<repo>/#/assistant` | • Load and view the latest Master Graph.<br/>• Add new concept nodes connected by 1 edge to existing nodes.<br/>• Attach rich cards ($LaTeX$, badges $\text{🟨 🟦 🟩}$).<br/>• Export named proposal JSON (`assistant_proposal_<Name>_<Date>.json`).<br/>• Assistant works strictly in browser (no GitHub/git knowledge needed). |
| **Автор (Author Mode - Local Desktop)** | `http://localhost:5173/#/author` | • Full administrative and creative graph suite.<br/>• "Проверить правки" button to load assistant proposals.<br/>• Draggable interactive review log with camera focus.<br/>• One-click export to `graph.json` for deployment. |

---

## 🎨 3. Official Watermark Specification (SVG Export)

Both Student and Assistant modes feature vector SVG export with the required diagonal 4-line watermark:
```text
LINEAR ALGEBRA
NOVOSIBIRSK STATE UNIVERSITY
© KORIAKIN R.A. © ULYANOV A.P.
© ALL RIGHTS RESERVED
```
- The `©` copyright symbol is rendered at **110%** of capital letter height (`<tspan font-size="110%">©</tspan>`).
- Diagonal pattern angle: **-30°**, repeated across the SVG canvas.

---

## 🛠️ 4. Workflows

### 👩‍🎓 A. Student Workflow
1. Open `https://<user>.github.io/<repo>/#/viewer`.
2. Explore graph with pan/zoom (RMB drag / wheel).
3. Double-click LMB on nodes/edges to open and pin formula cards.
4. Click RMB on any concept to isolate local subgraphs (Depth 1/2).
5. Click SVG export in bottom toolbar for high-resolution watermarked diagrams.

### 👨‍🏫 B. Teaching Assistant Workflow
1. Open `https://<user>.github.io/<repo>/#/assistant`.
2. Select any base node and click **«+ Создать узел и связать»**.
3. Fill in title, LaTeX formulas, and badges.
4. Click **«Сохранить правки (.json)»** in toolbar, enter Name & Notes.
5. Send the downloaded `assistant_proposal_<Name>_<Date>.json` file to the author (or save into `Proposals/`).

### 🧑‍💼 C. Master Author Workflow
1. Run local version (`npm run dev` in `linear_algebra_nsu_graph_v2_4`).
2. Click **«Проверить правки»** and select the assistant's JSON file.
3. Review added nodes/edges via floating checklist (clicking an item focuses camera).
4. Save the finalized `graph.json` and place it into `ActualGraph/graph.json` on GitHub.

---

## 🚀 5. GitHub Pages Deployment (Automated via GitHub Actions)

The repository comes configured with `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main, master ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build-and-deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build production bundle
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Enable GitHub Pages in 3 Steps:
1. Push repository files to GitHub (`main` branch).
2. Go to **Settings** → **Pages** in your GitHub repository.
3. Under **Build and deployment** → **Source**, choose **GitHub Actions**.

The site will automatically deploy to `https://<username>.github.io/<repo-name>/`.
