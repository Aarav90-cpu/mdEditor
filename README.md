# mdEditor ✨

`<HUMAN MADE>`

Hey there! Welcome to **mdEditor** — a passion project built from the ground up to be the leanest, fastest, and most feature-packed Markdown editor you've ever used. Currently available for **Linux**.

I got tired of electron apps hogging memory, so I built mdEditor using a **clean technology stack**. It combines the raw speed of a custom C-compiled statistical engine with a lightweight Python backend (`pywebview`), beautifully crafted Google Material 3 Web Components for the UI, and a zero-dependency Native JavaScript frontend parser! 🚀

## What's New? (Phase 1 Completed!)
- **Integrated AI Assistant:** A beautifully designed side-panel AI assistant with a stretching "capsule" input. Talk to your documents using Gemini, OpenAI, Claude, or OpenRouter! API calls are securely processed natively using our custom `libai.so` C plugin.
- **AES-256 Password Lock:** Military-grade encryption lets you lock any `.md` file with a password. It's automatically decrypted on the fly when you try to open it! 🔒
- **Fully Resizable Workspace:** Hover over the dividers between the editor, the preview renderer, and the AI panel to seamlessly drag and resize them to your liking.
- **Keyboard Shortcuts:** Native shortcuts support built right in (`Ctrl+S`, `Ctrl+N`, `Ctrl+B`, `Ctrl+O`, etc.) without browser interception.
- **Dark Mode Enhancements:** Dynamic icons that match your theme, gorgeous rounded inputs, and custom scrollbars.

## Core Features
- **Zero Third-Party Node/JS Dependencies:** Everything is built using raw vanilla HTML/CSS/JS. No React, no heavy frameworks.
- **Custom Markdown Parsing Engine:** Natively parses bold, italic, highlights, superscript, subscript, code blocks, checklists, custom tables, and multi-level nested headers without external libraries.
- **High-Performance C Stats:** Uses a native C-compiled library (`libstats.so`) via Python `ctypes` to calculate word, character, and line counts instantly on every keystroke.
- **Native Document Importer:** Can unzip and extract `.docx` (Word) and `.xlsx` (Excel) files natively in Python (using standard libraries) and convert them straight into Markdown tables and text!
- **Smart Paste (HTML to Markdown):** Copies rich-text formatting from any website or Word document and intelligently converts the DOM nodes into pure Markdown automatically upon pasting.
- **Advanced GitHub Alerts:** Support for nested blockquotes and styled colored alert boxes (`!NOTE`, `!WARNING`, etc.).

## Tech Stack
- **Frontend View:** HTML5, Vanilla CSS3, Vanilla JavaScript (ES6+).
- **Backend Bridge:** Python 3 + `pywebview` for native desktop OS window management and file I/O operations.
- **Performance Layer:** Native C compiler using GCC for statistics algorithms and AI API routing.

## How to Run
```bash
# Make sure the C-libraries are compiled
# gcc -shared -o clib/libstats.so -fPIC clib/stats.c
# gcc -shared -o clib/libai.so -fPIC clib/ai.c clib/cJSON.c -lcurl

# Run the PyWebView Application
python3 python/server.py
```
