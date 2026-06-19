all: libstats libai

libstats:
	gcc -shared -o clib/libstats.so -fPIC clib/stats.c

libai:
	gcc -shared -o clib/libai.so -fPIC clib/ai.c clib/cJSON.c -lcurl

run: all
	pip install qtpy PyQt6 PyQt6-WebEngine markdown2docx pandas openpyxl --break-system-packages || true
	python3 python/server.py

clean:
	rm -f clib/*.so
