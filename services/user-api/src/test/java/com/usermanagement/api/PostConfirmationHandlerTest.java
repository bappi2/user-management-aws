package com.usermanagement.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.amazonaws.services.lambda.runtime.events.CognitoUserPoolPostConfirmationEvent;
import com.usermanagement.api.users.PostConfirmationHandler;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PostConfirmationHandlerTest {

    private InMemoryUserRepository users;
    private PostConfirmationHandler handler;

    @BeforeEach
    void setUp() {
        users = new InMemoryUserRepository();
        handler = new PostConfirmationHandler(users);
    }

    @Test
    void confirmSignUpCreatesProfileWithSubAsId() {
        handler.handleRequest(event("PostConfirmation_ConfirmSignUp"), null);

        var user = users.findById("sub-123").orElseThrow();
        assertEquals("jane@example.com", user.email()); // normalised
        assertEquals("Jane", user.firstName());
    }

    @Test
    void retriedTriggerIsIdempotent() {
        handler.handleRequest(event("PostConfirmation_ConfirmSignUp"), null);
        handler.handleRequest(event("PostConfirmation_ConfirmSignUp"), null); // Cognito retry

        assertTrue(users.findById("sub-123").isPresent());
    }

    @Test
    void forgotPasswordConfirmationDoesNotCreateProfile() {
        handler.handleRequest(event("PostConfirmation_ConfirmForgotPassword"), null);

        assertTrue(users.findById("sub-123").isEmpty());
    }

    @Test
    void returnsTheSameEvent() {
        var event = event("PostConfirmation_ConfirmSignUp");

        assertEquals(event, handler.handleRequest(event, null));
    }

    private static CognitoUserPoolPostConfirmationEvent event(String triggerSource) {
        var request = new CognitoUserPoolPostConfirmationEvent.Request();
        request.setUserAttributes(Map.of(
                "sub", "sub-123",
                "email", "Jane@Example.com",
                "given_name", "Jane",
                "family_name", "Doe"));
        var event = new CognitoUserPoolPostConfirmationEvent();
        event.setTriggerSource(triggerSource);
        event.setRequest(request);
        return event;
    }
}
