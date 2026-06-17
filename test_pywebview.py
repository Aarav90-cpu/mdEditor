import webview
import os
html = os.path.abspath('frontend/index.html')
window = webview.create_window('test', html)
print("starting HTTP server mode...")
try:
    webview.start(http_server=True)
except Exception as e:
    print("Error:", e)
