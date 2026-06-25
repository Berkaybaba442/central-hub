package com.berkayhub.googlecalendar;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class GoogleTokenCryptoTest {
    @Test
    void encryptsAndDecryptsTokenWithoutKeepingPlainText() {
        GoogleCalendarProperties properties = new GoogleCalendarProperties();
        properties.setTokenSecret("test-secret-with-enough-entropy");
        GoogleTokenCrypto crypto = new GoogleTokenCrypto(properties);

        String encrypted = crypto.encrypt("refresh-token-value");

        assertThat(encrypted).isNotBlank();
        assertThat(encrypted).doesNotContain("refresh-token-value");
        assertThat(crypto.decrypt(encrypted)).isEqualTo("refresh-token-value");
    }

    @Test
    void blankTokenStaysBlank() {
        GoogleCalendarProperties properties = new GoogleCalendarProperties();
        properties.setTokenSecret("test-secret-with-enough-entropy");
        GoogleTokenCrypto crypto = new GoogleTokenCrypto(properties);

        assertThat(crypto.encrypt("")).isNull();
        assertThat(crypto.decrypt(null)).isNull();
    }
}
