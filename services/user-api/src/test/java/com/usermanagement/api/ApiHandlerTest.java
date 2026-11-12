package com.usermanagement.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.databind.JsonNode;
import com.usermanagement.api.http.Json;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ApiHandlerTest {

    private static final String VALID_REGISTER = """
            {"email":"Jane@Example.com","password":"secret1","firstName":"Jane","lastName":"Doe"}""";

    private ApiHandler handler;

    @BeforeEach
    void setUp() {
        handler = new ApiHandler(new InMemoryUserRepository());
    }

    @Test
    void registerReturnsNewId() throws Exception {
        var response = call("POST", "/v1/users/register", VALID_REGISTER, null);

        assertEquals(200, response.getStatusCode());
        assertFalse(body(response).get("id").asText().isBlank());
    }

    @Test
    void registerSameEmailTwiceReturns409() throws Exception {
        call("POST", "/v1/users/register", VALID_REGISTER, null);
        var response = call("POST", "/v1/users/register",
                VALID_REGISTER.replace("Jane@Example.com", "JANE@example.com"), null);

        assertEquals(409, response.getStatusCode());
        assertEquals("Users.EmailAlreadyExists", body(response).get("title").asText());
    }

    @Test
    void registerInvalidReturnsAllFieldErrors() throws Exception {
        var response = call("POST", "/v1/users/register",
                """
                {"email":"nope","password":"123","firstName":"","lastName":"Doe"}""", null);

        assertEquals(400, response.getStatusCode());
        JsonNode body = body(response);
        assertEquals("Validation.Failed", body.get("title").asText());
        assertEquals(3, body.get("errors").size()); // FirstName, Email, Password
    }

    @Test
    void invalidJsonReturns400() throws Exception {
        var response = call("POST", "/v1/users/register", "not json", null);

        assertEquals(400, response.getStatusCode());
        assertEquals("Request.InvalidJson", body(response).get("title").asText());
    }

    @Test
    void profileWithoutIdentityReturns401() throws Exception {
        var response = call("GET", "/v1/users/profile", null, null);

        assertEquals(401, response.getStatusCode());
    }

    @Test
    void profileRoundTrip() throws Exception {
        String id = body(call("POST", "/v1/users/register", VALID_REGISTER, null)).get("id").asText();

        var get = call("GET", "/v1/users/profile", null, id);
        assertEquals(200, get.getStatusCode());
        assertEquals("jane@example.com", body(get).get("email").asText()); // normalised

        var put = call("PUT", "/v1/users/profile", """
                {"firstName":"Janet","lastName":"Doe"}""", id);
        assertEquals(204, put.getStatusCode());

        assertEquals("Janet", body(call("GET", "/v1/users/profile", null, id)).get("firstName").asText());
    }

    @Test
    void updateUnknownUserReturns404() throws Exception {
        var response = call("PUT", "/v1/users/profile", """
                {"firstName":"J","lastName":"D"}""", "does-not-exist");

        assertEquals(404, response.getStatusCode());
        assertEquals("Users.NotFound", body(response).get("title").asText());
    }

    @Test
    void unknownRouteReturns404() {
        var response = call("DELETE", "/v1/users/profile", null, null);

        assertEquals(404, response.getStatusCode());
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
