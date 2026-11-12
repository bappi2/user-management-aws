package com.usermanagement.api.http;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

public final class Json {

    public static final ObjectMapper MAPPER = new ObjectMapper();

    private Json() {}

    public static <T> T read(String body, Class<T> type) {
        if (body == null || body.isBlank()) {
            throw ApiException.badRequest("Request.EmptyBody", "Request body is required");
        }
        try {
            T value = MAPPER.readValue(body, type);
            if (value == null) {
                throw ApiException.badRequest("Request.EmptyBody", "Request body is required");
            }
            return value;
        } catch (JsonProcessingException e) {
            throw ApiException.badRequest("Request.InvalidJson", "Body must be valid JSON with the expected fields");
        }
    }

    public static String write(Object value) {
        try {
            return MAPPER.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not serialize response", e);
        }
    }
}
