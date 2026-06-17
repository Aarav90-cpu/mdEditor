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
            'Supported Files (*.md;*.docx;*.xlsx;*.txt;*.png;*.jpg;*.jpeg;*.gif;*.webp)',
            'Markdown files (*.md)',
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
    
    webview.start(private_mode=False)
