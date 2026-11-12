package com.usermanagement.api.http;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/** Tiny FluentValidation-style builder. Collects all errors, then throws once. */
public final class Validation {

    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    private final List<ProblemDetails.FieldError> errors = new ArrayList<>();

    public Validation notBlank(String field, String value) {
        if (value == null || value.isBlank()) {
            errors.add(new ProblemDetails.FieldError(field, field + " must not be empty"));
        }
        return this;
    }

    public Validation email(String field, String value) {
        if (value == null || !EMAIL.matcher(value.trim()).matches()) {
            errors.add(new ProblemDetails.FieldError(field, field + " must be a valid email address"));
        }
        return this;
    }

    public Validation minLength(String field, String value, int min) {
        if (value == null || value.length() < min) {
            errors.add(new ProblemDetails.FieldError(field, field + " must be at least " + min + " characters"));
        }
        return this;
    }

    public void throwIfInvalid() {
        if (!errors.isEmpty()) {
            throw ApiException.validation(errors);
        }
    }
}
