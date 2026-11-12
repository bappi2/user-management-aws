package com.usermanagement.api.http;

import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import java.util.Map;

public final class HttpResponses {

    private HttpResponses() {}

    public static APIGatewayProxyResponseEvent ok(Object body) {
        return new APIGatewayProxyResponseEvent()
                .withStatusCode(200)
                .withHeaders(Map.of("Content-Type", "application/json"))
                .withBody(Json.write(body));
    }

    public static APIGatewayProxyResponseEvent noContent() {
        return new APIGatewayProxyResponseEvent().withStatusCode(204).withBody("");
    }

    public static APIGatewayProxyResponseEvent problem(ApiException e) {
        return new APIGatewayProxyResponseEvent()
                .withStatusCode(e.status())
                .withHeaders(Map.of("Content-Type", "application/problem+json"))
                .withBody(Json.write(e.toProblemDetails()));
    }
}
