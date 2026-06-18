<div align="center">
  <h1>mdEditor</h1>
</div>

<div align="center">
  <img src="https://img.shields.io/badge/Markdown-000000?style=for-the-badge&logo=markdown&logoColor=white" alt="Markdown">
  <img src="https://img.shields.io/badge/Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black" alt="Linux">
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/C-00599C?style=for-the-badge&logo=c&logoColor=white" alt="C">
</div>

---

## What is it?
**mdEditor** is a lightning-fast, highly-capable Markdown editor and viewer currently built exclusively for **Linux**. It was created as a passion project to deliver an incredibly lean and memory-efficient writing environment by marrying a JavaScript frontend with a high-performance custom C-compiled statistical engine and a lightweight Python backend.

## How is it better than others?
Modern markdown editors like Obsidian or Typora rely heavily on Electron, packaging entire web browsers into desktop applications which hog system memory and feel sluggish. They suffer from "feature creep," adding bloated plugin ecosystems and complex knowledge graph tools that distract from the core writing experience. 

<<<<<<< HEAD
**mdEditor** abandons Electron completely. By using PyWebView for native OS windowing, JS for parsing, and a raw C-backend (`libstats.so` and `libai.so`) for heavy computations, mdEditor achieves instant startup times, minimal memory overhead, and lightning-fast real-time rendering. You get true raw control over your Markdown with the power of native OS performance.

## Features
- **Integrated Native AI Assistant:** Seamless side-panel AI chat powered by Gemini, OpenAI, Claude, and OpenRouter, processed securely via our C plugin (`libai.so`).
- **AES-256 File Locking:** Military-grade password protection that natively encrypts and decrypts your `.md` files on the fly.
- **Custom Markdown Parsing Engine:** Native parser supporting bold, italic, highlights, superscript, subscript, code blocks, checklists, and custom tables.
- **High-Performance C Stats:** Instantaneous word, character, and line counting processed in C (`libstats.so`) via Python `ctypes`.
- **Native Document Importer:** Unzips and extracts `.docx` and `.xlsx` files straight into Markdown tables and text without third-party converters.
- **Smart Paste:** Intelligently copies rich-text formatting from any website and converts DOM nodes directly into Markdown upon pasting.
- **Advanced GitHub Alerts:** Support for nested blockquotes and beautifully styled colored alert boxes (`!NOTE`, `!WARNING`, etc.).
=======
## Core Features
- **Custom Markdown Parsing Engine:** Natively parses bold, italic, highlights, superscript, subscript, code blocks, checklists, custom tables, and multi-level nested headers without external libraries.
- **High-Performance C Stats:** Uses a native C-compiled library (`libstats.so`) via Python `ctypes` to calculate word, character, and line counts instantly on every keystroke.
- **Native Document Importer:** Can unzip and extract `.docx` (Word) and `.xlsx` (Excel) files natively in Python (using standard libraries) and convert them straight into Markdown tables and text!
- **Smart Paste (HTML to Markdown):** Copies rich-text formatting from any website or Word document and intelligently converts the DOM nodes into pure Markdown automatically upon pasting.
- **Advanced GitHub Alerts:** Support for nested blockquotes and styled colored alert boxes (`!NOTE`, `!WARNING`, etc.).

## Tech Stack
- **Frontend View:** HTML5, CSS3, Material3Web, JS.
- **Backend Bridge:** Python 3 + `pywebview` for native desktop OS window management and file I/O operations.
- **Performance Layer:** Native C compiler using GCC for statistics algorithms and AI API routing.
>>>>>>> 073728bf20f33ecbf076a19c3625ff246a2d3e72

## Credits
Huge thanks to the creators of the technologies that made this possible:
- **[PyWebView](https://pywebview.flowrl.com/)** for providing a lightweight, native GUI bridge to Python.
- **[cJSON](https://github.com/DaveGamble/cJSON)** by Dave Gamble for the incredibly fast C-based JSON parser used in our AI module.
- **[Material Web Components](https://github.com/material-components/material-web)** by Google for the stunning and accessible UI components.

## How to Install & Run
1. Make sure you have Python 3, `make`, and GCC installed on your Linux machine.
2. Clone the repository: `git clone git@github.com:Aarav90-cpu/mdEditor.git`
3. Install Python dependencies: `pip install pywebview`
4. Build the C plugins and run the editor:
```bash
make run
```

## Dependencies
- **Material 3 UI (`@material/web`)**: Used to deliver gorgeous buttons, dialogs, sliders, and icons for the frontend.
- **`pywebview`**: For rendering the web UI natively in a Python window.
- **`libcurl`**: Required by the C-backend for making secure AI API requests.

---
**Licensed:** Apache License 2.0 Aarav Ravindra Kharade 2026
