# mdEditor

**mdEditor** is a lightning-fast, highly-capable Markdown editor and viewer built with a pure vanilla technology stack. It combines the raw speed of a custom C-compiled statistical engine with a lightweight Python backend (`pywebview`) and a zero-dependency Native JavaScript frontend parser.

## Features Completed (Phase 1)
- **Zero Third-Party Node/JS Dependencies:** Everything is built using vanilla HTML/CSS/JS.
- **Custom Markdown Parsing Engine:** Natively parses bold, italic, highlights, superscript, subscript, code blocks, checklists, custom tables, and multi-level nested headers without external libraries.
- **High-Performance C Stats:** Uses a native C-compiled library (`libstats.so`) via Python `ctypes` to calculate word, character, and line counts instantly on every keystroke.
- **Native Document Importer:** Can unzip and extract `.docx` (Word) and `.xlsx` (Excel) files natively in Python (using only standard libraries) and convert them straight into Markdown tables and text!
- **Image Support:** Imports local images directly into the Markdown syntax.
- **Smart Paste (HTML to Markdown):** Copies rich-text formatting from any website or Word document and intelligently converts the DOM nodes into pure Markdown automatically upon pasting.
- **Advanced GitHub Alerts:** Support for nested blockquotes and styled colored alert boxes (`!NOTE`, `!WARNING`, etc.).
- **Live Text Zoom & Formatting:** Custom text sizing and global zoom out-of-the-box.

## Tech Stack
- **Frontend View:** HTML5, Vanilla CSS3, Vanilla JavaScript (ES6+). No React, No Tailwind.
- **Backend Bridge:** Python 3 + `pywebview` for native desktop OS window management and file I/O operations.
- **Performance Layer:** Native C compiler using GCC for statistics algorithms.

## How to Run
```bash
# Make sure the C-library is compiled (if modifying stats.c)
# gcc -shared -o clib/libstats.so -fPIC clib/stats.c

# Run the PyWebView Application
python3 python/server.py
```

*Built natively for those who hate bloat.*
