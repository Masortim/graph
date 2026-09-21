# 🌐 Linear Algebra NSU — Interactive Concept & Dependency Graph (v2.4.0)

Interactive concept graph visualization and knowledge mapping system for the **Linear Algebra course at Novosibirsk State University (NSU)**.

Developed by **© Koriaкin R.A. & @Ulyanov A.P.**

---

## ✨ Key Features (Version 2.4.0)

- 🎓 **Student Mode (`#/viewer` or `?mode=student`):** Fullscreen-style distraction-free environment for interactive exploration. Double-click LMB pinning of KaTeX badges, RMB local subgraph exploration, and watermarked SVG vector exports.
- 🧑‍🏫 **Assistant Mode (`#/assistant` or `?mode=assistant`):** Collaborative editing allowing assistants to propose new concept nodes (with single-edge connections), modify edge badge hints / deletion suggestions, and download named proposal JSON files (`assistant_proposal_<Name>_<Date>.json`).
- ✍️ **Author / Master Mode (`#/author` or default `/`):** Full graph editor with proposal review pipeline ("Проверить правки"), floating draggable review log with checklist `[✓]`, camera jump on click, and master graph export (`ActualGraph/graph.json`).
- 📐 **Comprehensive $LaTeX$ / KaTeX Support:** Mathematical notation across all nodes, edges, search filters, and vector SVG exports.
- 🖼️ **Security Watermarking:** Built-in vector SVG watermarking for student exports with the official 4-line diagonal NSU mark.
- 📦 **Automated GitHub Deployment:** Single-click GitHub Pages deployment via GitHub Actions (`.github/workflows/deploy.yml`).

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build
```

See **[GITHUB_DEPLOYMENT_GUIDE.md](./GITHUB_DEPLOYMENT_GUIDE.md)** for detailed documentation on repository layout, deployment, and role workflows.
