package com.usermanagement.api;

import java.time.Duration;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;

/** Builds AWS SDK clients once per Lambda environment (cold start), reused by every invocation. */
final class AwsClients {

    private AwsClients() {}

    static DynamoDbClient dynamoDb() {
        return DynamoDbClient.builder()
                .region(Region.of(System.getenv("AWS_REGION")))   // set by Lambda; skips region lookup
                .credentialsProvider(DefaultCredentialsProvider.create())
                .httpClient(UrlConnectionHttpClient.builder().build())
                .overrideConfiguration(config -> config
                        .apiCallTimeout(Duration.ofSeconds(3))         // whole call incl. retries
                        .apiCallAttemptTimeout(Duration.ofSeconds(1))) // each single attempt
                .build();
    }
}
