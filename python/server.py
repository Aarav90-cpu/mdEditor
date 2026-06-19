import webview
import os
import ctypes

clib_path = os.path.join(os.path.dirname(__file__), '..', 'clib', 'libstats.so')
try:
    stats_lib = ctypes.CDLL(clib_path)
    stats_lib.get_text_stats.argtypes = [ctypes.c_char_p, ctypes.POINTER(ctypes.c_int), ctypes.POINTER(ctypes.c_int), ctypes.POINTER(ctypes.c_int)]
except Exception as e:
    print(f"Failed to load C library: {e}")
    stats_lib = None

ai_clib_path = os.path.join(os.path.dirname(__file__), '..', 'clib', 'libai.so')
try:
    ai_lib = ctypes.CDLL(ai_clib_path)
    ai_lib.save_api_key.argtypes = [ctypes.c_char_p, ctypes.c_char_p]
    ai_lib.ask_ai.argtypes = [ctypes.c_char_p, ctypes.c_char_p, ctypes.c_char_p, ctypes.c_char_p, ctypes.c_int]
    ai_lib.get_models.argtypes = [ctypes.c_char_p, ctypes.c_char_p, ctypes.c_int]
except Exception as e:
    print(f"Failed to load AI C library: {e}")
    ai_lib = None

class Api:
    def __init__(self):
        self.window = None
        self.is_dirty = False

    def set_dirty(self, dirty):
        self.is_dirty = dirty

    def get_image_base64(self, filepath):
        import base64
        import os
        try:
            if not os.path.exists(filepath):
                return None
            ext = os.path.splitext(filepath)[1].lower()
            with open(filepath, 'rb') as img_file:
                b64 = base64.b64encode(img_file.read()).decode('utf-8')
            mime_type = 'image/' + ('jpeg' if ext in ['.jpg', '.jpeg'] else ext[1:])
            return f"data:{mime_type};base64,{b64}"
        except Exception as e:
            return None

    def get_fernet(self, password, salt):
        import base64
        from cryptography.fernet import Fernet
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password.encode('utf-8')))
        return Fernet(key)

    def decrypt_content(self, password, salt_hex, ciphertext):
        try:
            salt = bytes.fromhex(salt_hex)
            f = self.get_fernet(password, salt)
            plaintext = f.decrypt(ciphertext.encode('utf-8')).decode('utf-8')
            return {"success": True, "content": plaintext}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_stats(self, text):
        if stats_lib:
            text_bytes = text.encode('utf-8')
            words = ctypes.c_int()
            chars = ctypes.c_int()
            lines = ctypes.c_int()
            stats_lib.get_text_stats(text_bytes, ctypes.byref(words), ctypes.byref(chars), ctypes.byref(lines))
            return {"words": words.value, "chars": chars.value, "lines": lines.value}
        else:
            return {"words": len(text.split()), "chars": len(text), "lines": len(text.split('\n'))}

    def save_api_key(self, provider, key):
        if ai_lib:
            ai_lib.save_api_key(provider.encode('utf-8'), key.encode('utf-8'))
            return True
        return False

    def ask_ai(self, provider, model, prompt):
        if ai_lib:
            response_buf = ctypes.create_string_buffer(65536) # 64KB buffer
            ai_lib.ask_ai(provider.encode('utf-8'), model.encode('utf-8'), prompt.encode('utf-8'), response_buf, 65536)
            return response_buf.value.decode('utf-8', errors='ignore')
        return "AI library not loaded natively."

    def get_models(self, provider):
        if ai_lib:
            response_buf = ctypes.create_string_buffer(65536)
            ai_lib.get_models(provider.encode('utf-8'), response_buf, 65536)
            import json
            try:
                return json.loads(response_buf.value.decode('utf-8', errors='ignore'))
            except:
                return []
        return []

    def open_file(self):
        file_types = (
            'Supported Files (*.md;*.docx;*.xlsx;*.ipynb;*.txt;*.png;*.jpg;*.jpeg;*.gif;*.webp)',
            'Markdown files (*.md)',
            'Jupyter Notebooks (*.ipynb)',
            'Word Documents (*.docx)',
            'Excel Spreadsheets (*.xlsx)',
            'Text Files (*.txt)',
            'Image Files (*.png;*.jpg;*.jpeg;*.gif;*.webp)',
            'All files (*.*)'
        )
        result = self.window.create_file_dialog(webview.FileDialog.OPEN, allow_multiple=False, file_types=file_types)
        if result and len(result) > 0:
            filepath = result[0]
            ext = os.path.splitext(filepath)[1].lower()
            if ext in ['.png', '.jpg', '.jpeg', '.gif', '.webp']:
                return {
                    "type": "image",
                    "path": filepath
                }
            
            content = ""
            if ext == '.docx':
                content = self.extract_docx(filepath)
            elif ext == '.xlsx':
                content = self.extract_xlsx(filepath)
            elif ext == '.ipynb':
                try:
                    import json
                    with open(filepath, 'r', encoding='utf-8') as f:
                        nb = json.load(f)
                    md_lines = []
                    for cell in nb.get('cells', []):
                        source = "".join(cell.get('source', []))
                        if cell.get('cell_type') == 'markdown':
                            md_lines.append(source)
                        elif cell.get('cell_type') == 'code':
                            # Detect language if possible, else default to python
                            lang = 'python'
                            if 'metadata' in cell and 'language' in cell['metadata']:
                                lang = cell['metadata']['language']
                            md_lines.append(f"```{lang}\n{source}\n```")
                    content = "\n\n".join(md_lines)
                except Exception as e:
                    return {"type": "error", "error": f"Failed to parse ipynb: {str(e)}"}
            else:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                if content.startswith('LOCKED_MD\n'):
                    parts = content.split('\n', 2)
                    if len(parts) >= 3:
                        return {
                            "type": "encrypted",
                            "path": filepath,
                            "filename": os.path.basename(filepath),
                            "salt": parts[1],
                            "ciphertext": parts[2]
                        }
                    
            return {
                "type": "document",
                "content": content,
                "path": filepath,
                "filename": os.path.basename(filepath) if ext in ['.md', '.txt'] else os.path.basename(filepath).replace(ext, '.md')
            }
        return None

    def extract_docx(self, filepath):
        import zipfile
        import xml.etree.ElementTree as ET
        try:
            with zipfile.ZipFile(filepath) as z:
                xml_content = z.read('word/document.xml')
            tree = ET.fromstring(xml_content)
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            paragraphs = []
            for p in tree.findall('.//w:p', ns):
                texts = [node.text for node in p.findall('.//w:t', ns) if node.text]
                if texts:
                    paragraphs.append(''.join(texts))
            return '\n\n'.join(paragraphs)
        except Exception as e:
            return f"Error extracting DOCX: {e}"

    def extract_xlsx(self, filepath):
        import zipfile
        import xml.etree.ElementTree as ET
        try:
            with zipfile.ZipFile(filepath) as z:
                try:
                    strings_xml = z.read('xl/sharedStrings.xml')
                    str_tree = ET.fromstring(strings_xml)
                    ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
                    
                    shared_strings = []
                    for si in str_tree.findall('.//ns:si', ns):
                        t_node = si.find('ns:t', ns)
                        if t_node is not None and t_node.text:
                            shared_strings.append(t_node.text)
                        else:
                            shared_strings.append(''.join([t.text for t in si.findall('.//ns:t', ns) if t.text]))
                except KeyError:
                    shared_strings = []
                    ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
                
                sheet_xml = z.read('xl/worksheets/sheet1.xml')
            
            sheet_tree = ET.fromstring(sheet_xml)
            rows = []
            for row in sheet_tree.findall('.//ns:row', ns):
                row_data = []
                for cell in row.findall('.//ns:c', ns):
                    v_node = cell.find('ns:v', ns)
                    if v_node is not None:
                        val = v_node.text
                        if cell.get('t') == 's' and shared_strings:
                            val = shared_strings[int(val)]
                        row_data.append(val)
                    else:
                        row_data.append('')
                if row_data:
                    rows.append('| ' + ' | '.join(row_data) + ' |')
            
            if not rows:
                return ""
                
            cols_count = rows[0].count('|') - 1
            divider = '|' + '|'.join(['---'] * cols_count) + '|'
            rows.insert(1, divider)
            return '\n'.join(rows)
        except Exception as e:
            return f"Error extracting XLSX: {e}"

    def save_file(self, content, current_path, password=None):
        import os
        if not current_path:
            file_types = ('Markdown files (*.md)', 'All files (*.*)')
            result = self.window.create_file_dialog(webview.FileDialog.SAVE, allow_multiple=False, file_types=file_types, save_filename='Untitled.md')
            if result and len(result) > 0:
                current_path = result[0]
            else:
                return None
        
        if password:
            salt = os.urandom(16)
            f = self.get_fernet(password, salt)
            ciphertext = f.encrypt(content.encode('utf-8')).decode('utf-8')
            final_content = f"LOCKED_MD\n{salt.hex()}\n{ciphertext}"
        else:
            final_content = content

        with open(current_path, 'w', encoding='utf-8') as f:
            f.write(final_content)
            
        return {
            "path": current_path,
            "filename": os.path.basename(current_path)
        }

    def save_dropped_image(self, b64_data, filename, current_md_path):
        import os
        import base64
        try:
            if not current_md_path:
                save_dir = os.path.join(os.getcwd(), 'images')
            else:
                save_dir = os.path.join(os.path.dirname(current_md_path), 'images')
            
            if not os.path.exists(save_dir):
                os.makedirs(save_dir)
            
            base, ext = os.path.splitext(filename)
            counter = 1
            final_path = os.path.join(save_dir, filename)
            while os.path.exists(final_path):
                final_path = os.path.join(save_dir, f"{base}_{counter}{ext}")
                counter += 1
                
            header, encoded = b64_data.split(",", 1)
            with open(final_path, "wb") as fh:
                fh.write(base64.b64decode(encoded))
                
            return {
                "success": True,
                "path": final_path
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def export_pdf(self, html_text):
        file_types = ('PDF Document (*.pdf)', 'All files (*.*)')
        result = self.window.create_file_dialog(webview.FileDialog.SAVE, allow_multiple=False, file_types=file_types, save_filename='Export.pdf')
        if result and len(result) > 0:
            target_path = result[0]
            try:
                from xhtml2pdf import pisa
                # Basic CSS to make the PDF look decent
                css = """
                <style>
                    body { font-family: Helvetica, Arial, sans-serif; font-size: 12pt; line-height: 1.5; color: #333; }
                    h1, h2, h3 { color: #111; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    pre { background-color: #f8f8f8; padding: 10px; border: 1px solid #ddd; white-space: pre-wrap; }
                    code { font-family: Courier, monospace; background-color: #f8f8f8; padding: 2px 4px; border-radius: 4px; }
                    img { max-width: 100%; }
                    blockquote { border-left: 4px solid #ddd; padding-left: 10px; color: #666; font-style: italic; }
                </style>
                """
                full_html = f"<html><head>{css}</head><body>{html_text}</body></html>"
                
                with open(target_path, "w+b") as result_file:
                    pisa_status = pisa.CreatePDF(full_html, dest=result_file)
                
                if pisa_status.err:
                    return {"success": False, "error": "PDF generation encountered errors."}
                return {"success": True, "path": target_path}
            except Exception as e:
                import traceback
                traceback.print_exc()
                return {"success": False, "error": str(e)}
        return {"success": False, "error": "Canceled"}

    def export_docx(self, markdown_text):
        file_types = ('Word Document (*.docx)', 'All files (*.*)')
        result = self.window.create_file_dialog(webview.FileDialog.SAVE, allow_multiple=False, file_types=file_types, save_filename='Export.docx')
        if result and len(result) > 0:
            target_path = result[0]
            try:
                from Markdown2docx import Markdown2docx
                # Markdown2docx appends .docx to the project name, so we must remove the extension
                project_name = target_path
                if project_name.lower().endswith('.docx'):
                    project_name = project_name[:-5]
                
                # Markdown2docx expects markdown as a list of strings if provided directly
                project = Markdown2docx(project_name, markdown=[markdown_text])
                project.eat_soup()
                project.save()
                return {"success": True, "path": target_path}
            except Exception as e:
                import traceback
                traceback.print_exc()
                return {"success": False, "error": str(e)}
        return {"success": False, "error": "Canceled"}

    def export_excel(self, html_text):
        file_types = ('Excel Spreadsheet (*.xlsx)', 'All files (*.*)')
        result = self.window.create_file_dialog(webview.FileDialog.SAVE, allow_multiple=False, file_types=file_types, save_filename='Export.xlsx')
        if result and len(result) > 0:
            target_path = result[0]
            try:
                import pandas as pd
                tables = pd.read_html(html_text)
                if not tables:
                    return {"success": False, "error": "No tables found in document."}
                with pd.ExcelWriter(target_path, engine='openpyxl') as writer:
                    for i, table in enumerate(tables):
                        table.to_excel(writer, sheet_name=f'Table_{i+1}', index=False)
                return {"success": True, "path": target_path}
            except Exception as e:
                return {"success": False, "error": str(e)}
        return {"success": False, "error": "Canceled"}

    def export_ipynb(self, markdown_text):
        file_types = ('Jupyter Notebook (*.ipynb)', 'All files (*.*)')
        result = self.window.create_file_dialog(webview.FileDialog.SAVE, allow_multiple=False, file_types=file_types, save_filename='Export.ipynb')
        if result and len(result) > 0:
            target_path = result[0]
            try:
                import re
                import json
                cells = []
                # Split by ``` language ... ```
                parts = re.split(r'(```[a-zA-Z0-9]*\n.*?\n```)', markdown_text, flags=re.DOTALL)
                
                for part in parts:
                    part = part.strip()
                    if not part:
                        continue
                    if part.startswith('```'):
                        # Code block
                        lines = part.split('\n')
                        lang = lines[0][3:].strip()
                        code = '\n'.join(lines[1:-1])
                        # If language matches typically code block, default to python code cell
                        if lang in ['python', 'py', 'r', 'julia', '']:
                            cells.append({
                                "cell_type": "code",
                                "execution_count": None,
                                "metadata": {},
                                "outputs": [],
                                "source": [line + "\n" for line in code.split('\n')[:-1]] + [code.split('\n')[-1]] if code else []
                            })
                        else:
                            # If it's a bash/json/etc block, we can just keep it as markdown cell for jupyter
                            cells.append({
                                "cell_type": "markdown",
                                "metadata": {},
                                "source": [line + "\n" for line in part.split('\n')[:-1]] + [part.split('\n')[-1]]
                            })
                    else:
                        # Markdown block
                        cells.append({
                            "cell_type": "markdown",
                            "metadata": {},
                            "source": [line + "\n" for line in part.split('\n')[:-1]] + [part.split('\n')[-1]]
                        })
                        
                nb = {
                    "cells": cells,
                    "metadata": {},
                    "nbformat": 4,
                    "nbformat_minor": 4
                }
                
                with open(target_path, "w", encoding="utf-8") as f:
                    json.dump(nb, f, indent=1)
                    
                return {"success": True, "path": target_path}
            except Exception as e:
                import traceback
                traceback.print_exc()
                return {"success": False, "error": str(e)}
        return {"success": False, "error": "Canceled"}


if __name__ == '__main__':
    api = Api()
    html_path = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'index.html')
    
    # We load index.html without file:// scheme so PyWebView can serve it via its built-in HTTP server
    # This prevents WebKitGTK CORS issues with modern ES modules from esm.run
    window = webview.create_window('mdEditor', os.path.abspath(html_path), js_api=api, width=1024, height=768)
    api.window = window
    
    def check_close():
        result = window.create_confirmation_dialog('Unsaved Changes', 'You have unsaved changes! Click OK to discard them and exit, or Cancel to go back and save.')
        if result:
            api.is_dirty = False
            window.destroy()

    def on_closing():
        if api.is_dirty:
            import threading
            threading.Thread(target=check_close).start()
            return False
        return True
        
    window.events.closing += on_closing

    webview.start(private_mode=False, gui='qt')
