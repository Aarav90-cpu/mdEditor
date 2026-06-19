window.addEventListener('error', function(e) {
    const err = document.createElement('div');
    err.style.cssText = 'position:fixed;top:0;left:0;background:red;color:white;z-index:9999;padding:10px;font-size:12px;';
    err.innerText = e.message + ' at ' + e.filename + ':' + e.lineno;
    document.body.appendChild(err);
});
window.addEventListener('unhandledrejection', function(e) {
    const err = document.createElement('div');
    err.style.cssText = 'position:fixed;top:40px;left:0;background:orange;color:black;z-index:9999;padding:10px;font-size:12px;';
    err.innerText = "Promise rejection: " + e.reason;
    document.body.appendChild(err);
});
function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function parseInline(text) {
    text = text.replace(/(^|\s)(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank">$2</a>');
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    text = text.replace(/\(([^)]+)\)\[([^\]]+)\]/g, '<a href="$1" target="_blank">$2</a>');
    text = text.replace(/\*\*\*([^*]+)\*\*\*/g, '<b><i>$1</i></b>');
    text = text.replace(/___([^_]+)___/g, '<b><i>$1</i></b>');
    text = text.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    text = text.replace(/__([^_]+)__/g, '<b>$1</b>');
    text = text.replace(/\*([^*]+)\*/g, '<i>$1</i>');
    text = text.replace(/\b_([^_]+)_\b/g, '<i>$1</i>');
    text = text.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    text = text.replace(/\+\+([^+]+)\+\+/g, '<u>$1</u>');
    text = text.replace(/==([^=]+)==/g, '<mark>$1</mark>');
    text = text.replace(/\^([^\s\^]+)\^/g, '<sup>$1</sup>');
    text = text.replace(/~([^\s~]+)~/g, '<sub>$1</sub>');
    text = text.replace(/\|\|([^|]+)\|\|/g, '<span class="spoiler" onclick="this.classList.toggle(\'revealed\')">$1</span>');
    text = text.replace(/\[\[([^\]]+)\]\]/g, '<kbd>$1</kbd>');
    text = text.replace(/\$([^$\n]+)\$/g, '<span class="math-inline">\\($1\\)</span>');
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

    const emojis = {
        ':smile:': '😄', ':laughing:': '😆', ':blush:': '😊', ':heart:': '❤️',
        ':thumbsup:': '👍', ':thumbsdown:': '👎', ':fire:': '🔥', ':star:': '⭐',
        ':rocket:': '🚀', ':check:': '✅', ':x:': '❌', ':warning:': '⚠️',
        ':sparkles:': '✨', ':bug:': '🐛', ':tada:': '🎉', ':memo:': '📝',
        ':zap:': '⚡', ':hammer:': '🔨', ':art:': '🎨', ':bulb:': '💡'
    };


    text = text.replace(/:[a-z_]+:/g, match => emojis[match] || match);

    return text;
}

function parseMarkdown(md) {
    let placeholders = [];

    md = md.replace(/\$\$([\s\S]*?)\$\$/g, function(match, math) {
        let id = placeholders.length;
        let safeMath = escapeHtml(math.trim());
        placeholders.push(`<div class="math-block">$$${safeMath}$$</div>`);
        return `__BLOCK_${id}__`;
    });

    md = md.replace(/```([\s\S]*?)```/g, function(match, code) {
        let id = placeholders.length;
        let firstLineEnd = code.indexOf('\n');
        let actualCode = code;
        let lang = '';
        if (firstLineEnd !== -1) {
            lang = code.substring(0, firstLineEnd).trim();
            actualCode = code.substring(firstLineEnd + 1);
        }
        
        let safeCode = escapeHtml(actualCode);
        let langBadge = lang ? `<span class="lang-badge">${lang}</span>` : '';
        placeholders.push(`<div class="code-wrapper">
            ${langBadge}
            <button class="copy-btn" onclick="copyCode(this)">Copy</button>
            <pre><code>${safeCode}</code></pre>
        </div>`);
        return `__BLOCK_${id}__`;
    });

    let lines = md.split('\n');
    let html = '';
    let inList = false;
    let listStack = [];
    let inTable = false;
    let tableHtml = '';
    let tableAlignments = [];
    let inBlockquote = false;
    let blockquoteHtml = '';
    let blockquoteType = '';

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        let trimmed = line.trim();

        let bqMatch = line.match(/^(>+)\s*(.*)$/);
        if (bqMatch) {
            let level = bqMatch[1].length;
            let content = bqMatch[2];

            if (!inBlockquote) {
                inBlockquote = true;
                let alertMatch = content.match(/^!\[?([^\]\s]+)\]?/i) || content.match(/^!\s*([a-zA-Z]+)/);
                if (alertMatch) {
                    blockquoteType = alertMatch[1].toLowerCase();
                    if (blockquoteType === 'eroor') blockquoteType = 'error';
                    if (blockquoteType === 'disclamer') blockquoteType = 'disclaimer';
                    
                    blockquoteHtml = `<blockquote class="alert alert-${blockquoteType} level-${level}">\n<div class="alert-title">${blockquoteType.toUpperCase()}</div>\n`;
                } else {
                    blockquoteHtml = `<blockquote class="level-${level}">\n${parseInline(content)}<br/>\n`;
                }
            } else {
                blockquoteHtml += `<div class="level-${level}">${parseInline(content)}</div>\n`;
            }
            continue;
        } else if (inBlockquote) {
            inBlockquote = false;
            html += blockquoteHtml + '</blockquote>\n';
            blockquoteHtml = '';
        }

        if (/^(---|\*\*\*|___)\s*$/.test(trimmed)) {
            html += '<hr/>\n';
            continue;
        }

        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            if (!inTable) {
                inTable = true;
                tableHtml = '<table>\n';
                tableAlignments = [];
            }
            let isHeaderDivider = line.match(/^\|[-:\|\s]+\|$/);
            if (isHeaderDivider) {
                let cols = trimmed.split('|').filter(c => c.length > 0);
                tableAlignments = cols.map(c => {
                    let cTrim = c.trim();
                    if (cTrim.startsWith(':') && cTrim.endsWith(':')) return 'center';
                    if (cTrim.endsWith(':')) return 'right';
                    return 'left';
                });
                continue;
            } else {
                let cells = line.split('|');
                cells.shift();
                cells.pop();
                
                tableHtml += '<tr>';
                for (let j = 0; j < cells.length; j++) {
                    let tag = (tableHtml.includes('</th>') && tableAlignments.length > 0) ? 'td' : 'th';
                    let align = tableAlignments[j] || 'left';
                    tableHtml += `<${tag} style="text-align: ${align}">${parseInline(cells[j].trim())}</${tag}>`;
                }
                tableHtml += '</tr>\n';
            }
            continue;
        } else if (inTable) {
            inTable = false;
            html += tableHtml + '</table>\n';
            tableHtml = '';
        }

        let listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
        if (listMatch) {
            let indent = listMatch[1].length;
            let bullet = listMatch[2];
            let content = listMatch[3];
            let isOrdered = /^\d+\.$/.test(bullet);
            let listType = isOrdered ? 'ol' : 'ul';

            if (!inList) {
                inList = true;
                html += `<${listType} class="indent-${indent}">\n`;
            }

            let checkedClass = '';
            if (content.startsWith('[ ] ')) {
                content = `<input type="checkbox" disabled> ` + content.substring(4);
            } else if (content.startsWith('[x] ') || content.startsWith('[X] ')) {
                content = `<input type="checkbox" checked disabled> <span class="checked-item">` + content.substring(4) + `</span>`;
                checkedClass = 'class="task-done"';
            }

            html += `<li ${checkedClass} style="margin-left: ${indent * 10}px">${parseInline(content)}</li>\n`;
            continue;
        } else if (inList) {
            inList = false;
            html += `</ul>\n`;
        }

        let headerMatch = line.match(/^(#{1,12})\s+(.*)$/);
        if (headerMatch) {
            let level = headerMatch[1].length;
            let content = parseInline(headerMatch[2]);
            if (level <= 6) {
                html += `<h${level}>${content}</h${level}>\n`;
            } else {
                html += `<div class="custom-h${level}">${content}</div>\n`;
            }
            continue;
        }

        let detailsMatch = line.match(/^\?\?\?\s+(.*)$/);
        if (detailsMatch) {
            html += `<details><summary>${parseInline(detailsMatch[1])}</summary>\n`;
            continue;
        }
        if (trimmed === '???') {
            html += `</details>\n`;
            continue;
        }

        if (trimmed === '') {
            html += '<br/>\n';
        } else if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
            html += line + '\n';
        } else if (trimmed.startsWith('__BLOCK_')) {
            html += trimmed + '\n';
        } else {
            html += parseInline(line) + '<br/>\n';
        }
    }

    if (inList) html += `</ul>\n`;
    if (inTable) html += tableHtml + '</table>\n';
    if (inBlockquote) html += blockquoteHtml + '</blockquote>\n';

    for (let i = 0; i < placeholders.length; i++) {
        html = html.replace(`__BLOCK_${i}__`, placeholders[i]);
    }

    return html;
}

window.copyCode = function(btn) {
    const codeBlock = btn.nextElementSibling.querySelector('code');
    navigator.clipboard.writeText(codeBlock.innerText).then(() => {
        const originalText = btn.innerText;
        btn.innerText = 'Copied!';
        setTimeout(() => { btn.innerText = originalText; }, 2000);
    });
};

const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const statWords = document.getElementById('stat-words');
const statChars = document.getElementById('stat-chars');
const statLines = document.getElementById('stat-lines');
const currentFile = document.getElementById('current-file');

let currentFilePath = null;
let lastSavedContent = '';
let isDirty = false;

const unsavedDialog = document.getElementById('unsaved-dialog');
const btnUnsavedCancel = document.getElementById('btn-unsaved-cancel');
const btnUnsavedDiscard = document.getElementById('btn-unsaved-discard');
const btnUnsavedSave = document.getElementById('btn-unsaved-save');

let pendingAction = null;

function handleUnsaved(action) {
    if (editor.value !== lastSavedContent && editor.value.trim() !== '') {
        pendingAction = action;
        unsavedDialog.show();
        return true;
    }
    return false;
}

if (btnUnsavedCancel) {
    btnUnsavedCancel.addEventListener('click', () => {
        unsavedDialog.close();
        pendingAction = null;
    });
}

if (btnUnsavedDiscard) {
    btnUnsavedDiscard.addEventListener('click', () => {
        unsavedDialog.close();
        if (pendingAction) pendingAction();
        pendingAction = null;
    });
}

if (btnUnsavedSave) {
    btnUnsavedSave.addEventListener('click', async () => {
        unsavedDialog.close();
        if (window.pywebview && window.pywebview.api) {
            const result = await window.pywebview.api.save_file(editor.value, currentFilePath);
            if (result) {
                currentFilePath = result.path;
                currentFile.innerText = result.filename;
                lastSavedContent = editor.value;
                if (pendingAction) pendingAction();
            }
        } else {
            alert("PyWebView API not available.");
        }
        pendingAction = null;
    });
}

editor.addEventListener('keydown', (e) => {
    // If about to delete a chunk of selected text, save state
    if ((e.key === 'Backspace' || e.key === 'Delete') && editor.selectionStart !== editor.selectionEnd) {
        saveState();
    }
});

editor.addEventListener('beforeinput', (e) => {
    if (e.inputType === 'insertFromPaste' || e.inputType === 'deleteByCut') {
        saveState();
    }
});

editor.addEventListener('input', (e) => {
    const text = editor.value;
    preview.innerHTML = parseMarkdown(text);
    
    // Trigger MathJax typesetting asynchronously if available
    if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([preview]).catch((err) => console.log('MathJax error:', err));
    }

    if (isUndoRedoAction) return;

    if (e.inputType === 'insertFromPaste' || e.inputType === 'deleteByCut') {
        saveState();
    } else if (e.inputType === 'insertText' && (e.data === ' ' || e.data === '\n' || /[.,;:!?]/.test(e.data))) {
        saveState();
    } else if (e.inputType === 'deleteContentBackward' || e.inputType === 'deleteContentForward') {
        if (lastInputType === 'insertText') saveState();
    } else if (e.inputType === 'insertText') {
        if (lastInputType && lastInputType.startsWith('delete')) saveState();
    }
    lastInputType = e.inputType;
    
    // Asynchronously load local images for preview
    const images = preview.querySelectorAll('img');
    images.forEach(img => {
        const src = img.getAttribute('src');
        if (src && src.startsWith('/')) {
            if (window.pywebview && window.pywebview.api) {
                window.pywebview.api.get_image_base64(src).then(b64 => {
                    if (b64) {
                        img.src = b64;
                    }
                });
            }
        }
    });

    const currentlyDirty = (editor.value !== lastSavedContent && editor.value.trim() !== '');
    if (currentlyDirty !== isDirty) {
        isDirty = currentlyDirty;
        if (window.pywebview && window.pywebview.api) {
            window.pywebview.api.set_dirty(isDirty);
        }
    }
    
    if (window.pywebview && window.pywebview.api) {
        window.pywebview.api.get_stats(text).then(stats => {
            statWords.innerText = `${stats.words} words`;
            statChars.innerText = `${stats.chars} chars`;
            statLines.innerText = `${stats.lines} lines`;
        });
    } else {
        const charsWithoutSpace = text.replace(/\s/g, '').length;
        statChars.innerText = `${charsWithoutSpace} chars`;
        statLines.innerText = `${text.split('\n').length} lines`;
        statWords.innerText = `${text.split(/\s+/).filter(w => w.length > 0).length} words`;
    }
});

document.getElementById('btn-new').addEventListener('click', () => {
    const action = () => {
        editor.value = '';
        currentFilePath = null;
        currentFile.innerText = 'Untitled.md';
        lastSavedContent = '';
        editor.dispatchEvent(new Event('input'));
    };
    if (!handleUnsaved(action)) {
        action();
    }
});

document.getElementById('btn-open').addEventListener('click', async () => {
    if (window.pywebview && window.pywebview.api) {
        const result = await window.pywebview.api.open_file();
        if (result) {
            if (result.type === 'image') {
                const imgMd = `\n![Image](${result.path})\n`;
                editor.setRangeText(imgMd, editor.selectionStart, editor.selectionEnd, 'end');
                editor.dispatchEvent(new Event('input'));
                editor.focus();
            } else if (result.type === 'encrypted') {
                showPasswordDialog('Unlock File', 'This file is encrypted. Enter password:', async (pwd) => {
                    if (pwd) {
                        const decryptResult = await window.pywebview.api.decrypt_content(pwd, result.salt, result.ciphertext);
                        if (decryptResult.success) {
                            isFileLocked = true;
                            sessionPassword = pwd;
                            document.querySelector('#btn-lock md-icon').innerText = 'lock';
                            const action = () => {
                                editor.value = decryptResult.content;
                                currentFilePath = result.path;
                                currentFile.innerText = result.filename;
                                lastSavedContent = editor.value;
                                editor.dispatchEvent(new Event('input'));
                            };
                            if (!handleUnsaved(action)) { action(); }
                        } else {
                            alert("Incorrect password or corrupted file.");
                        }
                    }
                });
            } else {
                const action = () => {
                    editor.value = result.content;
                    if (result.filename.endsWith('.md') && result.path.endsWith('.md')) {
                        currentFilePath = result.path;
                    } else {
                        currentFilePath = null; // Force save as for imported .docx, .xlsx, .txt
                    }
                    currentFile.innerText = result.filename;
                    lastSavedContent = editor.value;
                    
                    // Reset lock state for normal documents
                    isFileLocked = false;
                    sessionPassword = null;
                    document.querySelector('#btn-lock md-icon').innerText = 'lock_open';
                    
                    editor.dispatchEvent(new Event('input'));
                };
                if (!handleUnsaved(action)) {
                    action();
                }
            }
        }
    } else {
        alert("PyWebView API not available.");
    }
});

document.getElementById('btn-save').addEventListener('click', async () => {
    if (window.pywebview && window.pywebview.api) {
        const result = await window.pywebview.api.save_file(editor.value, currentFilePath, sessionPassword);
        if (result) {
            currentFilePath = result.path;
            currentFile.innerText = result.filename;
            lastSavedContent = editor.value;
            editor.dispatchEvent(new Event('input')); // This triggers dirty state reset
            alert("File saved successfully!");
        }
    } else {
        alert("PyWebView API not available.");
    }
});

document.getElementById('btn-export-dropdown').addEventListener('click', (e) => {
    e.stopPropagation();
    const menu = document.getElementById('export-menu');
    menu.classList.toggle('hidden');
});

document.addEventListener('click', () => {
    const menu = document.getElementById('export-menu');
    if (!menu.classList.contains('hidden')) {
        menu.classList.add('hidden');
    }
});

document.getElementById('btn-export-pdf').addEventListener('click', async () => {
    if (window.pywebview && window.pywebview.api) {
        const html = document.getElementById('preview').innerHTML;
        const result = await window.pywebview.api.export_pdf(html);
        if (result.success) {
            alert("Successfully exported to PDF: " + result.path);
        } else if (result.error !== "Canceled") {
            alert("Export failed: " + result.error);
        }
    } else {
        alert("PyWebView API not available.");
    }
});

document.getElementById('btn-export-docx').addEventListener('click', async () => {
    if (window.pywebview && window.pywebview.api) {
        const result = await window.pywebview.api.export_docx(editor.value);
        if (result.success) {
            alert("Successfully exported to DOCX: " + result.path);
        } else if (result.error !== "Canceled") {
            alert("Export failed: " + result.error);
        }
    } else {
        alert("PyWebView API not available.");
    }
});

document.getElementById('btn-export-excel').addEventListener('click', async () => {
    if (window.pywebview && window.pywebview.api) {
        const html = document.getElementById('preview').innerHTML;
        const result = await window.pywebview.api.export_excel(html);
        if (result.success) {
            alert("Successfully exported to Excel: " + result.path);
        } else if (result.error !== "Canceled") {
            alert("Export failed: " + result.error);
        }
    } else {
        alert("PyWebView API not available.");
    }
});

const btnExportIpynb = document.getElementById('btn-export-ipynb');
if (btnExportIpynb) {
    btnExportIpynb.addEventListener('click', async () => {
        if (window.pywebview && window.pywebview.api) {
            const markdown = editor.value;
            const result = await window.pywebview.api.export_ipynb(markdown);
            if (result.success) {
                alert("Successfully exported to Jupyter Notebook: " + result.path);
            } else if (result.error !== "Canceled") {
                alert("Export failed: " + result.error);
            }
        } else {
            alert("PyWebView API not available.");
        }
    });
}

let undoStack = [];
let redoStack = [];
let isUndoRedoAction = false;
const MAX_HISTORY = 10;
let lastInputType = null;

// Initialize undo stack with the starting state
undoStack.push({
    value: editor.value,
    selectionStart: editor.selectionStart,
    selectionEnd: editor.selectionEnd
});

function saveState() {
    if (isUndoRedoAction) return;
    const currentState = {
        value: editor.value,
        selectionStart: editor.selectionStart,
        selectionEnd: editor.selectionEnd
    };
    if (undoStack.length === 0 || undoStack[undoStack.length - 1].value !== currentState.value) {
        undoStack.push(currentState);
        if (undoStack.length > MAX_HISTORY + 1) { // +1 for the initial state
            undoStack.shift();
        }
        redoStack = []; 
    }
}

function doUndo() {
    saveState();
    if (undoStack.length > 1) {
        isUndoRedoAction = true;
        try {
            redoStack.push(undoStack.pop());
            const state = undoStack[undoStack.length - 1];
            editor.value = state.value;
            editor.setSelectionRange(state.selectionStart || 0, state.selectionEnd || 0);
            editor.dispatchEvent(new Event('input'));
        } catch (e) {
            console.error('Error during undo', e);
        } finally {
            isUndoRedoAction = false;
            editor.focus();
        }
    }
}

function doRedo() {
    saveState();
    if (redoStack.length > 0) {
        isUndoRedoAction = true;
        try {
            const state = redoStack.pop();
            undoStack.push(state);
            editor.value = state.value;
            editor.setSelectionRange(state.selectionStart || 0, state.selectionEnd || 0);
            editor.dispatchEvent(new Event('input'));
        } catch (e) {
            console.error('Error during redo', e);
        } finally {
            isUndoRedoAction = false;
            editor.focus();
        }
    }
}

function wrapText(prefix, suffix, defaultText = 'text') {
    saveState();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = editor.value.substring(start, end);
    const replacement = selectedText.length > 0 ? selectedText : defaultText;
    
    editor.setRangeText(prefix + replacement + suffix, start, end, 'select');
    editor.dispatchEvent(new Event('input'));
    saveState();
    editor.focus();
}

function insertLinePrefix(prefix) {
    saveState();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const textBefore = editor.value.substring(0, start);
    
    const lineStart = textBefore.lastIndexOf('\n') + 1;
    editor.setRangeText(prefix, lineStart, lineStart, 'end');
    editor.dispatchEvent(new Event('input'));
    saveState();
    editor.focus();
}

document.getElementById('btn-undo').addEventListener('click', doUndo);
document.getElementById('btn-redo').addEventListener('click', doRedo);

document.querySelectorAll('.fmt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const fmt = btn.getAttribute('data-fmt');
        switch(fmt) {
            case 'bold': wrapText('**', '**', 'bold text'); break;
            case 'italic': wrapText('*', '*', 'italic text'); break;
            case 'underline': wrapText('++', '++', 'underline text'); break;
            case 'strikethrough': wrapText('~~', '~~', 'strikethrough text'); break;
            case 'h1': insertLinePrefix('# '); break;
            case 'h2': insertLinePrefix('## '); break;
            case 'h3': insertLinePrefix('### '); break;
            case 'quote': insertLinePrefix('> '); break;
            case 'code': wrapText('`', '`', 'code'); break;
            case 'link': wrapText('[', '](url)', 'link text'); break;
            case 'list-ul': insertLinePrefix('- '); break;
            case 'list-ol': insertLinePrefix('1. '); break;
            case 'table': 
                const tableTpl = '\n| Header 1 | Header 2 |\n|---|---|\n| Cell 1 | Cell 2 |\n';
                editor.setRangeText(tableTpl, editor.selectionStart, editor.selectionEnd, 'end');
                editor.dispatchEvent(new Event('input'));
                editor.focus();
                break;
        }
    });
});



// --- Theme Toggle Logic ---
const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
    let savedTheme = 'dark'; // Default to dark
    try {
        if (typeof localStorage !== 'undefined') {
            savedTheme = localStorage.getItem('mdEditor-theme') || 'dark';
        }
    } catch (e) {
        console.warn('localStorage not available', e);
    }
    
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Defer setting selected property to ensure component is ready
    customElements.whenDefined('md-switch').then(() => {
        themeToggle.selected = (savedTheme === 'dark');
    });

    themeToggle.addEventListener('change', () => {
        const newTheme = themeToggle.selected ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('mdEditor-theme', newTheme);
            }
        } catch (e) {
            console.warn('localStorage not available', e);
        }
    });
}

// --- General Settings Logic ---
const settingsModal = document.getElementById('settings-modal');
const btnSettings = document.getElementById('btn-settings');
const btnCloseSettings = document.getElementById('btn-close-settings');

if (btnSettings) {
    btnSettings.addEventListener('click', () => {
        settingsModal.classList.remove('hidden');
        if (typeof updateModels === 'function') updateModels();
    });
}
if (btnCloseSettings) {
    btnCloseSettings.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
    });
}

let currentZoom = 16;
document.getElementById('btn-zoom-in').addEventListener('click', () => {
    currentZoom += 2;
    document.documentElement.style.setProperty('--doc-font-size', `${currentZoom}px`);
    document.getElementById('zoom-level').innerText = `${Math.round((currentZoom/16)*100)}%`;
});

document.getElementById('btn-zoom-out').addEventListener('click', () => {
    if (currentZoom > 8) {
        currentZoom -= 2;
        document.documentElement.style.setProperty('--doc-font-size', `${currentZoom}px`);
        document.getElementById('zoom-level').innerText = `${Math.round((currentZoom/16)*100)}%`;
    }
});



function htmlNodeToMarkdown(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    let md = '';
    const tag = node.tagName.toLowerCase();

    let childrenMd = Array.from(node.childNodes).map(htmlNodeToMarkdown).join('');

    switch(tag) {
        case 'b': case 'strong': return `**${childrenMd}**`;
        case 'i': case 'em': return `*${childrenMd}*`;
        case 'u': return `<u>${childrenMd}</u>`;
        case 'del': case 's': return `~~${childrenMd}~~`;
        case 'code': return `\`${childrenMd}\``;
        case 'a': return `[${childrenMd}](${node.getAttribute('href') || ''})`;
        case 'img': return `![${node.getAttribute('alt') || ''}](${node.getAttribute('src') || ''})`;
        case 'h1': return `\n# ${childrenMd}\n\n`;
        case 'h2': return `\n## ${childrenMd}\n\n`;
        case 'h3': return `\n### ${childrenMd}\n\n`;
        case 'h4': return `\n#### ${childrenMd}\n\n`;
        case 'h5': return `\n##### ${childrenMd}\n\n`;
        case 'h6': return `\n###### ${childrenMd}\n\n`;
        case 'p': case 'div': return `\n${childrenMd}\n`;
        case 'br': return `\n`;
        case 'ul': 
            return '\n' + Array.from(node.children).map(li => `- ${htmlNodeToMarkdown(li)}`).join('\n') + '\n';
        case 'ol': 
            return '\n' + Array.from(node.children).map((li, i) => `${i+1}. ${htmlNodeToMarkdown(li)}`).join('\n') + '\n';
        case 'li': return childrenMd;
        case 'table':
            let tableStr = '\n';
            let rows = Array.from(node.querySelectorAll('tr'));
            rows.forEach((row, rowIndex) => {
                let cells = Array.from(row.querySelectorAll('th, td'));
                tableStr += '| ' + cells.map(htmlNodeToMarkdown).join(' | ') + ' |\n';
                if (rowIndex === 0) {
                    tableStr += '|' + cells.map(() => '---').join('|') + '|\n';
                }
            });
            return tableStr + '\n';
        default: return childrenMd;
    }
}

editor.addEventListener('paste', (e) => {
    const items = e.clipboardData.items || [];
    let imagePasted = false;
    for (let i = 0; i < items.length; i++) {
        if (items[i] && items[i].type && items[i].type.startsWith('image/')) {
            e.preventDefault();
            const file = items[i].getAsFile();
            handleImageUpload(file);
            imagePasted = true;
            break;
        }
    }
    if (imagePasted) return;

    const textData = e.clipboardData.getData('text') || e.clipboardData.getData('text/plain');
    if (textData) {
        const isUrl = /^https?:\/\/[^\s<]+$/.test(textData.trim());
        if (isUrl && editor.selectionStart !== editor.selectionEnd) {
            e.preventDefault();
            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            const selectedText = editor.value.substring(start, end);
            const replacement = `[${selectedText}](${textData.trim()})`;
            editor.setRangeText(replacement, start, end, 'end');
            editor.dispatchEvent(new Event('input'));
            saveState();
            return;
        }
    }

    const htmlData = e.clipboardData.getData('text/html');
    if (htmlData) {
        e.preventDefault();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlData, 'text/html');
        let md = htmlNodeToMarkdown(doc.body).replace(/\n{3,}/g, '\n\n').trim();
        
        editor.setRangeText(md, editor.selectionStart, editor.selectionEnd, 'end');
        editor.dispatchEvent(new Event('input'));
    }
});

window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => e.preventDefault());

editor.addEventListener('dragover', (e) => {
    e.preventDefault();
});

editor.addEventListener('dragenter', (e) => {
    e.preventDefault();
});

editor.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
            const file = e.dataTransfer.files[i];
            if (file.type.startsWith('image/')) {
                handleImageUpload(file);
            }
        }
    }
});

function handleImageUpload(file) {
    const placeholder = `![Uploading ${file.name || 'image.png'}...]()`;
    const start = editor.selectionStart;
    editor.setRangeText(placeholder, start, editor.selectionEnd, 'end');
    editor.dispatchEvent(new Event('input'));
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        const b64 = e.target.result;
        if (window.pywebview && window.pywebview.api && window.pywebview.api.save_dropped_image) {
            try {
                const result = await window.pywebview.api.save_dropped_image(b64, file.name || 'pasted_image.png', currentFilePath);
                if (result && result.success) {
                    editor.value = editor.value.replace(placeholder, `![${file.name || 'image'}](${result.path})`);
                    editor.dispatchEvent(new Event('input'));
                    saveState();
                } else {
                    alert("Failed to save image: " + (result ? result.error : "Unknown error"));
                    editor.value = editor.value.replace(placeholder, '');
                    editor.dispatchEvent(new Event('input'));
                }
            } catch (err) {
                console.error(err);
                editor.value = editor.value.replace(placeholder, `![${file.name || 'image'}](${b64})`);
                editor.dispatchEvent(new Event('input'));
                saveState();
            }
        } else {
            editor.value = editor.value.replace(placeholder, `![${file.name || 'image'}](${b64})`);
            editor.dispatchEvent(new Event('input'));
            saveState();
        }
    };
    reader.readAsDataURL(file);
}

// --- AI Integration Logic ---
const aiSidebar = document.getElementById('ai-sidebar');
const btnAiToggle = document.getElementById('btn-ai-toggle');
const btnSaveKey = document.getElementById('btn-save-key');
const btnAskAi = document.getElementById('btn-ask-ai');
const aiPrompt = document.getElementById('ai-prompt');
const aiChatHistory = document.getElementById('ai-chat-history');
const aiProvider = document.getElementById('ai-provider');
const aiModel = document.getElementById('ai-model');

async function updateModels() {
    const provider = aiProvider.value;
    if (!provider) return;
    
    aiModel.innerHTML = ''; // clear options
    
    if (window.pywebview && window.pywebview.api) {
        try {
            const models = await window.pywebview.api.get_models(provider);
            models.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m;
                opt.innerText = m;
                aiModel.appendChild(opt);
            });
            if (models.length > 0) {
                aiModel.value = models[0];
            }
        } catch (e) {
            console.error("Failed to fetch models", e);
        }
    }
}

aiProvider.addEventListener('change', updateModels);

// Auto-expand textarea
aiPrompt.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

btnAiToggle.addEventListener('click', () => {
    aiSidebar.classList.toggle('hidden');
    document.getElementById('splitter-2').classList.toggle('hidden');
    if (!aiSidebar.classList.contains('hidden')) {
        updateModels();
    }
});

document.getElementById('btn-close-ai').addEventListener('click', () => {
    aiSidebar.classList.add('hidden');
    document.getElementById('splitter-2').classList.add('hidden');
});

btnSaveKey.addEventListener('click', async () => {
    const provider = aiProvider.value;
    const key = document.getElementById('ai-api-key').value;
    if (!key) {
        alert("Please enter a key.");
        return;
    }
    if (window.pywebview && window.pywebview.api) {
        const success = await window.pywebview.api.save_api_key(provider, key);
        if (success) {
            alert(provider + " API Key encrypted via AES-256 and saved successfully!");
            document.getElementById('ai-api-key').value = '';
            aiModal.classList.add('hidden');
            updateModels();
        } else {
            alert("Failed to save key. Make sure the C library is loaded.");
        }
    } else {
        alert("PyWebView API not available.");
    }
});

function appendAiMessage(role, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `ai-msg ${role}`;
    
    const label = document.createElement('strong');
    label.innerText = role === 'user' ? 'You: ' : 'AI: ';
    msgDiv.appendChild(label);
    
    const content = document.createElement('span');
    content.innerText = text;
    msgDiv.appendChild(content);

    if (role === 'ai') {
        const insertBtn = document.createElement('button');
        insertBtn.innerText = 'Insert';
        insertBtn.style.marginTop = '5px';
        insertBtn.style.display = 'block';
        insertBtn.style.fontSize = '12px';
        insertBtn.style.background = '#555';
        insertBtn.style.color = '#fff';
        insertBtn.style.border = 'none';
        insertBtn.style.cursor = 'pointer';
        insertBtn.onclick = () => {
            editor.setRangeText(text, editor.selectionStart, editor.selectionEnd, 'end');
            editor.dispatchEvent(new Event('input'));
            editor.focus();
        };
        msgDiv.appendChild(insertBtn);
    }
    
    aiChatHistory.appendChild(msgDiv);
    aiChatHistory.scrollTop = aiChatHistory.scrollHeight;
}

let isAiResponding = false;

btnAskAi.addEventListener('click', async () => {
    if (isAiResponding) return;
    
    const prompt = aiPrompt.value.trim();
    if (!prompt) return;
    
    const provider = aiProvider.value;
    const model = aiModel.value;
    
    appendAiMessage('user', prompt);
    aiPrompt.value = '';
    
    isAiResponding = true;
    btnAskAi.innerHTML = '<md-icon>stop</md-icon>';
    btnAskAi.style.background = 'var(--md-sys-color-error)';
    
    if (window.pywebview && window.pywebview.api) {
        appendAiMessage('ai', '...'); 
        const loadingDiv = aiChatHistory.lastChild;
        
        try {
            const response = await window.pywebview.api.ask_ai(provider, model, prompt);
            loadingDiv.remove();
            appendAiMessage('ai', response);
        } catch (e) {
            loadingDiv.remove();
            appendAiMessage('ai', "Error connecting to backend.");
        }
    } else {
        appendAiMessage('ai', "PyWebView API not available.");
    }
    
    isAiResponding = false;
    btnAskAi.innerHTML = '<md-icon>arrow_upward</md-icon>';
    btnAskAi.style.background = 'var(--accent)';
});

aiPrompt.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        btnAskAi.click();
    }
});

editor.dispatchEvent(new Event('input'));

// --- Lock & Password Logic ---
let sessionPassword = null;
let isFileLocked = false;

document.getElementById('btn-lock').addEventListener('click', () => {
    if (isFileLocked) {
        isFileLocked = false;
        sessionPassword = null;
        document.querySelector('#btn-lock md-icon').innerText = 'lock_open';
    } else {
        showPasswordDialog('Set Password', 'Enter a password to lock this file upon saving.', (pwd) => {
            if (pwd) {
                isFileLocked = true;
                sessionPassword = pwd;
                document.querySelector('#btn-lock md-icon').innerText = 'lock';
            }
        });
    }
});

function showPasswordDialog(title, msg, callback) {
    document.getElementById('password-title').innerText = title;
    document.getElementById('password-msg').innerText = msg;
    const input = document.getElementById('input-password');
    input.value = '';
    const dialog = document.getElementById('password-dialog');
    dialog.classList.remove('hidden');
    
    const submitBtn = document.getElementById('btn-password-submit');
    const cancelBtn = document.getElementById('btn-password-cancel');
    
    const cleanup = () => {
        dialog.classList.add('hidden');
        submitBtn.removeEventListener('click', onSubmit);
        cancelBtn.removeEventListener('click', onCancel);
    };
    
    const onSubmit = () => {
        const pwd = input.value;
        cleanup();
        callback(pwd);
    };
    const onCancel = () => {
        cleanup();
        callback(null);
    };
    
    submitBtn.addEventListener('click', onSubmit);
    cancelBtn.addEventListener('click', onCancel);
}

// --- Shortcuts Logic ---
document.getElementById('btn-show-shortcuts').addEventListener('click', () => {
    document.getElementById('settings-modal').classList.add('hidden');
    document.getElementById('shortcuts-dialog').classList.remove('hidden');
});

document.getElementById('btn-shortcuts-close').addEventListener('click', () => {
    document.getElementById('shortcuts-dialog').classList.add('hidden');
});

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey) {
        switch (e.key.toLowerCase()) {
            case 'z':
                e.preventDefault();
                doUndo();
                break;
            case 'y':
                e.preventDefault();
                doRedo();
                break;
            case 'b':
                e.preventDefault();
                wrapText('**', '**', 'bold text');
                break;
            case 'i':
                e.preventDefault();
                wrapText('*', '*', 'italic text');
                break;
            case 'u':
                e.preventDefault();
                wrapText('++', '++', 'underlined text');
                break;
            case 's':
                e.preventDefault();
                document.getElementById('btn-save').click();
                break;
            case 'o':
                e.preventDefault();
                document.getElementById('btn-open').click();
                break;
            case 'n':
                e.preventDefault();
                document.getElementById('btn-new').click();
                break;
        }
    }
});

// --- Resizable Panels Logic ---
const splitterOne = document.getElementById('splitter-1');
const splitterTwo = document.getElementById('splitter-2');
const editorPane = document.getElementById('editor-pane');
const previewPane = document.getElementById('preview-pane');

let isDraggingSplitter1 = false;
let isDraggingSplitter2 = false;

splitterOne.addEventListener('mousedown', (e) => {
    isDraggingSplitter1 = true;
    splitterOne.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
});

splitterTwo.addEventListener('mousedown', (e) => {
    isDraggingSplitter2 = true;
    splitterTwo.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
});

document.addEventListener('mousemove', (e) => {
    if (!isDraggingSplitter1 && !isDraggingSplitter2) return;
    
    const containerRect = document.querySelector('.editor-container').getBoundingClientRect();
    
    if (isDraggingSplitter1) {
        let newWidth = e.clientX - containerRect.left;
        const totalWidth = containerRect.width;
        newWidth = Math.max(100, Math.min(newWidth, totalWidth - 200));
        editorPane.style.flex = `0 0 ${newWidth}px`;
    }
    
    if (isDraggingSplitter2) {
        let sidebarWidth = containerRect.right - e.clientX;
        const totalWidth = containerRect.width;
        sidebarWidth = Math.max(200, Math.min(sidebarWidth, totalWidth - 300));
        aiSidebar.style.flex = `0 0 ${sidebarWidth}px`;
    }
});

document.addEventListener('mouseup', () => {
    if (isDraggingSplitter1) {
        isDraggingSplitter1 = false;
        splitterOne.classList.remove('dragging');
    }
    if (isDraggingSplitter2) {
        isDraggingSplitter2 = false;
        splitterTwo.classList.remove('dragging');
    }
    document.body.style.cursor = '';
});
saveState();
