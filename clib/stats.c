#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

void get_text_stats(const char *text, int *words, int *chars, int *lines) {
  *words = 0;
  *chars = 0;
  *lines = 1;

  if (text == NULL || text[0] == '\0') {
    *lines = 0;
    return;
  }

  int in_word = 0;
  for (int i = 0; text[i] != '\0'; i++) {
    if (text[i] == '\n') {
      (*lines)++;
    }
    if (isspace((unsigned char)text[i])) {
      in_word = 0;
    } else {
      (*chars)++;
      if (!in_word) {
        (*words)++;
        in_word = 1;
      }
    }
  }
}
