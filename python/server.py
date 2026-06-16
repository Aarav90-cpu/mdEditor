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

class Api:
    def __init__(self):
        self.window = None

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

    def open_file(self):
        file_types = ('Markdown files (*.md)', 'All files (*.*)')
        result = self.window.create_file_dialog(webview.FileDialog.OPEN, allow_multiple=False, file_types=file_types)
        if result and len(result) > 0:
            filepath = result[0]
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            return {
                "content": content,
                "path": filepath,
                "filename": os.path.basename(filepath)
            }
        return None

    def import_file(self):
        file_types = (
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
                    
            return {
                "type": "document",
                "content": content,
                "filename": os.path.basename(filepath).replace(ext, '.md')
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

    def save_file(self, content, current_path):
        if not current_path:
            file_types = ('Markdown files (*.md)', 'All files (*.*)')
            result = self.window.create_file_dialog(webview.FileDialog.SAVE, allow_multiple=False, file_types=file_types, save_filename='Untitled.md')
            if result:
                current_path = result
            else:
                return None
        
        with open(current_path, 'w', encoding='utf-8') as f:
            f.write(content)
            
        return {
            "path": current_path,
            "filename": os.path.basename(current_path)
        }

if __name__ == '__main__':
    api = Api()
    html_path = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'index.html')
    
    window = webview.create_window('mdEditor', f'file://{os.path.abspath(html_path)}', js_api=api, width=1024, height=768)
    api.window = window
    
    webview.start()
