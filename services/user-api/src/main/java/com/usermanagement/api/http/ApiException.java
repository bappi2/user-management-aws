package com.usermanagement.api.http;

import java.util.List;

/** Evently: Error + Result.Failure. Thrown by endpoints, turned into Problem Details by the router. */
public final class ApiException extends RuntimeException {

    private final int status;
    private final String title;
    private final List<ProblemDetails.FieldError> errors;

    public ApiException(int status, String title, String detail, List<ProblemDetails.FieldError> errors) {
        super(detail, null, false, false); // no stack trace: expected outcomes, not bugs
        this.status = status;
        this.title = title;
        this.errors = errors;
    }

    public static ApiException badRequest(String title, String detail) {
        return new ApiException(400, title, detail, null);
    }

    public static ApiException validation(List<ProblemDetails.FieldError> errors) {
        return new ApiException(400, "Validation.Failed", "One or more validation errors occurred", List.copyOf(errors));
    }

    public static ApiException unauthorized() {
        return new ApiException(401, "Auth.Unauthorized", "Missing or invalid user identity", null);
    }

    public static ApiException notFound(String title, String detail) {
        return new ApiException(404, title, detail, null);
    }

    public static ApiException conflict(String title, String detail) {
        return new ApiException(409, title, detail, null);
    }

    public int status() {
        return status;
    }

    public ProblemDetails toProblemDetails() {
        return new ProblemDetails("about:blank", title, status, getMessage(), errors);
    }
}
