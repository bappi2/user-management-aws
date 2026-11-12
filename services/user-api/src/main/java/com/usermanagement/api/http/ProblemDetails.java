package com.usermanagement.api.http;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

/** RFC 7807 Problem Details. Evently: ApiResults.Problem */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ProblemDetails(String type, String title, int status, String detail, List<FieldError> errors) {

    /** One validation failure. Evently: ValidationError -> errors[] */
    public record FieldError(String code, String description) {}
}
