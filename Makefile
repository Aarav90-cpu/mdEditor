all: libstats libai

libstats:
	gcc -shared -o clib/libstats.so -fPIC clib/stats.c

libai:
	gcc -shared -o clib/libai.so -fPIC clib/ai.c clib/cJSON.c -lcurl

run: all
	python3 python/server.py

clean:
	rm -f clib/*.so
