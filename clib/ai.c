#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <curl/curl.h>
#include <openssl/evp.h>
#include <openssl/aes.h>
#include "cJSON.h"

// Military-Grade AES-256-CBC Encryption Keys for Local Storage
static const unsigned char aes_key[32] = "mD_3dIt0r_S3cur3_K3y_256B_v1.0!!";
static const unsigned char aes_iv[16]  = "InitVector123456";

int aes_encrypt(const unsigned char *plaintext, int plaintext_len, unsigned char *ciphertext) {
    EVP_CIPHER_CTX *ctx;
    int len, ciphertext_len;

    ctx = EVP_CIPHER_CTX_new();
    EVP_EncryptInit_ex(ctx, EVP_aes_256_cbc(), NULL, aes_key, aes_iv);
    EVP_EncryptUpdate(ctx, ciphertext, &len, plaintext, plaintext_len);
    ciphertext_len = len;
    EVP_EncryptFinal_ex(ctx, ciphertext + len, &len);
    ciphertext_len += len;
    EVP_CIPHER_CTX_free(ctx);

    return ciphertext_len;
}

int aes_decrypt(const unsigned char *ciphertext, int ciphertext_len, unsigned char *plaintext) {
    EVP_CIPHER_CTX *ctx;
    int len, plaintext_len;

    ctx = EVP_CIPHER_CTX_new();
    EVP_DecryptInit_ex(ctx, EVP_aes_256_cbc(), NULL, aes_key, aes_iv);
    EVP_DecryptUpdate(ctx, plaintext, &len, ciphertext, ciphertext_len);
    plaintext_len = len;
    EVP_DecryptFinal_ex(ctx, plaintext + len, &len);
    plaintext_len += len;
    EVP_CIPHER_CTX_free(ctx);
    plaintext[plaintext_len] = '\0';

    return plaintext_len;
}

void save_api_key(const char* provider, const char* key) {
    char filename[256];
    sprintf(filename, ".%s_key.bin", provider);
    
    unsigned char ciphertext[1024];
    int c_len = aes_encrypt((unsigned char*)key, strlen(key), ciphertext);
    
    FILE *f = fopen(filename, "wb");
    if (f) {
        fwrite(ciphertext, 1, c_len, f);
        fclose(f);
    }
}

void load_api_key(const char* provider, char* out_key, int max_len) {
    char filename[256];
    sprintf(filename, ".%s_key.bin", provider);
    
    FILE *f = fopen(filename, "rb");
    if (f) {
        unsigned char ciphertext[1024];
        int c_len = fread(ciphertext, 1, sizeof(ciphertext), f);
        if (c_len > 0) {
            aes_decrypt(ciphertext, c_len, (unsigned char*)out_key);
            fclose(f);
            return;
        }
        fclose(f);
    }
    out_key[0] = '\0';
}

struct MemoryStruct {
  char *memory;
  size_t size;
};

static size_t WriteMemoryCallback(void *contents, size_t size, size_t nmemb, void *userp) {
  size_t realsize = size * nmemb;
  struct MemoryStruct *mem = (struct MemoryStruct *)userp;

  char *ptr = realloc(mem->memory, mem->size + realsize + 1);
  if(ptr == NULL) return 0;

  mem->memory = ptr;
  memcpy(&(mem->memory[mem->size]), contents, realsize);
  mem->size += realsize;
  mem->memory[mem->size] = 0;

  return realsize;
}

void extract_json_response(const char* json_str, const char* provider, char* out_val, int max_len) {
    cJSON *json = cJSON_Parse(json_str);
    if (!json) {
        strncpy(out_val, "Failed to parse API response JSON.", max_len - 1);
        return;
    }
    
    int found = 0;
    if (strcmp(provider, "Gemini") == 0) {
        cJSON *candidates = cJSON_GetObjectItemCaseSensitive(json, "candidates");
        if (cJSON_IsArray(candidates) && cJSON_GetArraySize(candidates) > 0) {
            cJSON *content = cJSON_GetObjectItemCaseSensitive(cJSON_GetArrayItem(candidates, 0), "content");
            cJSON *parts = cJSON_GetObjectItemCaseSensitive(content, "parts");
            if (cJSON_IsArray(parts) && cJSON_GetArraySize(parts) > 0) {
                cJSON *text = cJSON_GetObjectItemCaseSensitive(cJSON_GetArrayItem(parts, 0), "text");
                if (cJSON_IsString(text) && (text->valuestring != NULL)) {
                    strncpy(out_val, text->valuestring, max_len - 1);
                    found = 1;
                }
            }
        }
    } else if (strcmp(provider, "Claude") == 0) {
        cJSON *content = cJSON_GetObjectItemCaseSensitive(json, "content");
        if (cJSON_IsArray(content) && cJSON_GetArraySize(content) > 0) {
            cJSON *text = cJSON_GetObjectItemCaseSensitive(cJSON_GetArrayItem(content, 0), "text");
            if (cJSON_IsString(text) && (text->valuestring != NULL)) {
                strncpy(out_val, text->valuestring, max_len - 1);
                found = 1;
            }
        }
    } else { // OpenAI, OpenRouter, Grok
        cJSON *choices = cJSON_GetObjectItemCaseSensitive(json, "choices");
        if (cJSON_IsArray(choices) && cJSON_GetArraySize(choices) > 0) {
            cJSON *message = cJSON_GetObjectItemCaseSensitive(cJSON_GetArrayItem(choices, 0), "message");
            cJSON *content = cJSON_GetObjectItemCaseSensitive(message, "content");
            if (cJSON_IsString(content) && (content->valuestring != NULL)) {
                strncpy(out_val, content->valuestring, max_len - 1);
                found = 1;
            }
        }
    }
    
    if (!found) {
        // Handle error responses from API
        cJSON *error = cJSON_GetObjectItemCaseSensitive(json, "error");
        if (error) {
            cJSON *message = cJSON_GetObjectItemCaseSensitive(error, "message");
            if (cJSON_IsString(message)) {
                snprintf(out_val, max_len, "API Error: %s", message->valuestring);
            } else {
                strncpy(out_val, "API returned an error.", max_len - 1);
            }
        } else {
            strncpy(out_val, "Could not extract text from API response.", max_len - 1);
        }
    }
    cJSON_Delete(json);
}

void ask_ai(const char* provider, const char* model, const char* prompt, char* out_response, int max_len) {
    char api_key[512];
    load_api_key(provider, api_key, sizeof(api_key));

    if (strlen(api_key) == 0) {
        strcpy(out_response, "API Key not found. Please save it in the settings.");
        return;
    }

    CURL *curl;
    CURLcode res;
    curl = curl_easy_init();

    if(curl) {
        struct MemoryStruct chunk;
        chunk.memory = malloc(1);
        chunk.size = 0;

        struct curl_slist *headers = NULL;
        headers = curl_slist_append(headers, "Content-Type: application/json");

        char url[512];
        char *json_data = NULL;
        const char *system_prompt = "You are an intelligent markdown editor assistant inside mdEditor. You help users write, format, and generate beautiful markdown content. Your answers should be extremely concise, helpful, and formatted in markdown.";

        // Escape prompt using cJSON
        cJSON *req = cJSON_CreateObject();

        if (strcmp(provider, "Gemini") == 0) {
            sprintf(url, "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, api_key);
            
            cJSON *system_instruction = cJSON_AddObjectToObject(req, "systemInstruction");
            cJSON *sys_parts = cJSON_AddArrayToObject(system_instruction, "parts");
            cJSON *sys_part_item = cJSON_CreateObject();
            cJSON_AddStringToObject(sys_part_item, "text", system_prompt);
            cJSON_AddItemToArray(sys_parts, sys_part_item);

            cJSON *contents = cJSON_AddArrayToObject(req, "contents");
            cJSON *item = cJSON_CreateObject();
            cJSON *parts = cJSON_AddArrayToObject(item, "parts");
            cJSON *partItem = cJSON_CreateObject();
            cJSON_AddStringToObject(partItem, "text", prompt);
            cJSON_AddItemToArray(parts, partItem);
            cJSON_AddItemToArray(contents, item);
        } else if (strcmp(provider, "Claude") == 0) {
            strcpy(url, "https://api.anthropic.com/v1/messages");
            char auth_header[1024];
            sprintf(auth_header, "x-api-key: %s", api_key);
            headers = curl_slist_append(headers, auth_header);
            headers = curl_slist_append(headers, "anthropic-version: 2023-06-01");
            cJSON_AddStringToObject(req, "model", model);
            cJSON_AddNumberToObject(req, "max_tokens", 1024);
            cJSON_AddStringToObject(req, "system", system_prompt);
            cJSON *msgs = cJSON_AddArrayToObject(req, "messages");
            cJSON *msgItem = cJSON_CreateObject();
            cJSON_AddStringToObject(msgItem, "role", "user");
            cJSON_AddStringToObject(msgItem, "content", prompt);
            cJSON_AddItemToArray(msgs, msgItem);
        } else {
            if (strcmp(provider, "OpenAI") == 0) {
                strcpy(url, "https://api.openai.com/v1/chat/completions");
                cJSON_AddStringToObject(req, "model", model);
            } else if (strcmp(provider, "OpenRouter") == 0) {
                strcpy(url, "https://openrouter.ai/api/v1/chat/completions");
                cJSON_AddStringToObject(req, "model", model);
            }
            char auth_header[1024];
            sprintf(auth_header, "Authorization: Bearer %s", api_key);
            headers = curl_slist_append(headers, auth_header);
            cJSON *msgs = cJSON_AddArrayToObject(req, "messages");
            
            cJSON *sysItem = cJSON_CreateObject();
            cJSON_AddStringToObject(sysItem, "role", "system");
            cJSON_AddStringToObject(sysItem, "content", system_prompt);
            cJSON_AddItemToArray(msgs, sysItem);

            cJSON *msgItem = cJSON_CreateObject();
            cJSON_AddStringToObject(msgItem, "role", "user");
            cJSON_AddStringToObject(msgItem, "content", prompt);
            cJSON_AddItemToArray(msgs, msgItem);
        }

        json_data = cJSON_PrintUnformatted(req);
        cJSON_Delete(req);

        curl_easy_setopt(curl, CURLOPT_URL, url);
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, json_data);
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteMemoryCallback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, (void *)&chunk);
        
        res = curl_easy_perform(curl);
        
        if(res != CURLE_OK) {
            snprintf(out_response, max_len, "Network error: %s", curl_easy_strerror(res));
        } else {
            extract_json_response(chunk.memory, provider, out_response, max_len);
        }
        
        free(json_data);
        free(chunk.memory);
        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);
    } else {
        strcpy(out_response, "Failed to initialize curl.");
    }
}

void get_models(const char* provider, char* out_response, int max_len) {
    if (strcmp(provider, "Gemini") != 0) {
        strcpy(out_response, "[\"gpt-4o-mini\", \"gpt-4o\", \"claude-3-haiku-20240307\", \"claude-3-5-sonnet-20240620\", \"google/gemini-2.5-flash\"]");
        return;
    }
    
    char api_key[512];
    load_api_key(provider, api_key, sizeof(api_key));

    if (strlen(api_key) == 0) {
        strcpy(out_response, "[]");
        return;
    }

    CURL *curl;
    CURLcode res;
    curl = curl_easy_init();

    if(curl) {
        struct MemoryStruct chunk;
        chunk.memory = malloc(1);
        chunk.size = 0;

        char url[512];
        sprintf(url, "https://generativelanguage.googleapis.com/v1beta/models?key=%s", api_key);

        curl_easy_setopt(curl, CURLOPT_URL, url);
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteMemoryCallback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, (void *)&chunk);

        res = curl_easy_perform(curl);

        if(res == CURLE_OK) {
            cJSON *json = cJSON_Parse(chunk.memory);
            cJSON *models = cJSON_GetObjectItemCaseSensitive(json, "models");
            cJSON *res_array = cJSON_CreateArray();
            if (cJSON_IsArray(models)) {
                cJSON *model;
                cJSON_ArrayForEach(model, models) {
                    cJSON *name = cJSON_GetObjectItemCaseSensitive(model, "name");
                    if (cJSON_IsString(name)) {
                        const char* prefix = "models/";
                        if (strncmp(name->valuestring, prefix, strlen(prefix)) == 0) {
                            cJSON_AddItemToArray(res_array, cJSON_CreateString(name->valuestring + strlen(prefix)));
                        } else {
                            cJSON_AddItemToArray(res_array, cJSON_CreateString(name->valuestring));
                        }
                    }
                }
            }
            char *json_out = cJSON_PrintUnformatted(res_array);
            strncpy(out_response, json_out, max_len - 1);
            free(json_out);
            cJSON_Delete(res_array);
            cJSON_Delete(json);
        } else {
            strcpy(out_response, "[]");
        }

        free(chunk.memory);
        curl_easy_cleanup(curl);
    } else {
        strcpy(out_response, "[]");
    }
}

