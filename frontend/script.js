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
    text = text.replace(/\$([^$\n]+)\$/g, '<span class="math-inline">$1</span>');
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
        placeholders.push(`<div class="math-block">${safeMath}</div>`);
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

editor.addEventListener('input', () => {
    const text = editor.value;
    preview.innerHTML = parseMarkdown(text);
    
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
    editor.value = '';
    currentFilePath = null;
    currentFile.innerText = 'Untitled.md';
    editor.dispatchEvent(new Event('input'));
});

document.getElementById('btn-open').addEventListener('click', async () => {
    if (window.pywebview && window.pywebview.api) {
        const result = await window.pywebview.api.open_file();
        if (result) {
            editor.value = result.content;
            currentFilePath = result.path;
            currentFile.innerText = result.filename;
            editor.dispatchEvent(new Event('input'));
        }
    } else {
        alert("PyWebView API not available.");
    }
});

document.getElementById('btn-import').addEventListener('click', async () => {
    if (window.pywebview && window.pywebview.api) {
        const result = await window.pywebview.api.import_file();
        if (result) {
            if (result.type === 'image') {
                const imgMd = `\n![Image](${result.path})\n`;
                editor.setRangeText(imgMd, editor.selectionStart, editor.selectionEnd, 'end');
                editor.dispatchEvent(new Event('input'));
                editor.focus();
            } else {
                editor.value = result.content;
                currentFilePath = null;
                currentFile.innerText = result.filename;
                editor.dispatchEvent(new Event('input'));
            }
        }
    } else {
        alert("PyWebView API not available.");
    }
});

document.getElementById('btn-save').addEventListener('click', async () => {
    if (window.pywebview && window.pywebview.api) {
        const result = await window.pywebview.api.save_file(editor.value, currentFilePath);
        if (result) {
            currentFilePath = result.path;
            currentFile.innerText = result.filename;
            alert("File saved successfully!");
        }
    } else {
        alert("PyWebView API not available.");
    }
});

function wrapText(prefix, suffix, defaultText = 'text') {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = editor.value.substring(start, end);
    const replacement = selectedText.length > 0 ? selectedText : defaultText;
    
    editor.setRangeText(prefix + replacement + suffix, start, end, 'select');
    editor.dispatchEvent(new Event('input'));
    editor.focus();
}

function insertLinePrefix(prefix) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const textBefore = editor.value.substring(0, start);
    
    const lineStart = textBefore.lastIndexOf('\n') + 1;
    editor.setRangeText(prefix, lineStart, lineStart, 'end');
    editor.dispatchEvent(new Event('input'));
    editor.focus();
}

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

document.getElementById('sel-text-size').addEventListener('change', (e) => {
    const val = e.target.value;
    if (val) {
        wrapText(`<span style="font-size: ${val}">`, `</span>`, 'text');
        e.target.value = '';
    }
});

let currentZoom = 16;
document.getElementById('btn-zoom-in').addEventListener('click', () => {
    currentZoom += 2;
    document.documentElement.style.setProperty('--doc-font-size', `${currentZoom}px`);
    document.getElementById('zoom-label').innerText = `${currentZoom}px`;
});

document.getElementById('btn-zoom-out').addEventListener('click', () => {
    if (currentZoom > 8) {
        currentZoom -= 2;
        document.documentElement.style.setProperty('--doc-font-size', `${currentZoom}px`);
        document.getElementById('zoom-label').innerText = `${currentZoom}px`;
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

editor.dispatchEvent(new Event('input'));
