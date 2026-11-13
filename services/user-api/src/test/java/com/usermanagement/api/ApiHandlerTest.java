package com.usermanagement.api;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.databind.JsonNode;
import com.usermanagement.api.http.Json;
import com.usermanagement.api.users.User;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ApiHandlerTest {

    private static final String USER_ID = "user-1";

    private ApiHandler handler;

    @BeforeEach
    void setUp() {
        var users = new InMemoryUserRepository();
        users.insert(new User(USER_ID, "jane@example.com", "Jane", "Doe"));
        handler = new ApiHandler(users);
    }

    @Test
    void profileWithoutIdentityReturns401() {
        assertEquals(401, call("GET", "/v1/users/profile", null, null).getStatusCode());
    }

    @Test
    void getProfileReturnsUser() throws Exception {
        var response = call("GET", "/v1/users/profile", null, USER_ID);

        assertEquals(200, response.getStatusCode());
        assertEquals("jane@example.com", body(response).get("email").asText());
    }

    @Test
    void getProfileOfUnknownUserReturns404() throws Exception {
        var response = call("GET", "/v1/users/profile", null, "someone-else");

        assertEquals(404, response.getStatusCode());
        assertEquals("Users.NotFound", body(response).get("title").asText());
    }

    @Test
    void updateProfileThenGetReturnsNewName() throws Exception {
        var put = call("PUT", "/v1/users/profile", """
                {"firstName":"Janet","lastName":"Doe"}""", USER_ID);
        assertEquals(204, put.getStatusCode());

        assertEquals("Janet", body(call("GET", "/v1/users/profile", null, USER_ID)).get("firstName").asText());
    }

    @Test
    void updateWithEmptyNamesReturnsAllFieldErrors() throws Exception {
        var response = call("PUT", "/v1/users/profile", """
                {"firstName":"","lastName":" "}""", USER_ID);

        assertEquals(400, response.getStatusCode());
        assertEquals(2, body(response).get("errors").size());
    }

    @Test
    void updateWithInvalidJsonReturns400() throws Exception {
        var response = call("PUT", "/v1/users/profile", "not json", USER_ID);

        assertEquals(400, response.getStatusCode());
        assertEquals("Request.InvalidJson", body(response).get("title").asText());
    }

    @Test
    void registerRouteNoLongerExists() throws Exception {
        var response = call("POST", "/v1/users/register", "{}", null);

        assertEquals(404, response.getStatusCode());
        assertEquals("Route.NotFound", body(response).get("title").asText());
    }

    // --- helpers -------------------------------------------------------------

    private APIGatewayProxyResponseEvent call(String method, String resource, String body, String userId) {
        var context = new APIGatewayProxyRequestEvent.ProxyRequestContext();
        context.setRequestId("test-request");
        if (userId != null) {
            context.setAuthorizer(Map.<String, Object>of("claims", Map.of("sub", userId)));
        }
        var event = new APIGatewayProxyRequestEvent()
                .withHttpMethod(method)
                .withResource(resource)
                .withBody(body)
                .withRequestContext(context);
        return handler.handleRequest(event, null);
    }

    private static JsonNode body(APIGatewayProxyResponseEvent response) throws Exception {
        return Json.MAPPER.readTree(response.getBody());
    }
}
