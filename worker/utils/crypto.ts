let cachedKey: CryptoKey | null = null;
let cachedSecret: string | null = null;

/**
 * Verifies the Lemon Squeezy signature securely.
 */
export async function verifySignature(
    secret: string,
    headerSignature: string,
    rawBody: string
): Promise<boolean> {
    try {
        if (!secret || !headerSignature || !rawBody) {
            return false;
        }

        const normalizedSignature = headerSignature.toLowerCase().trim();

        const encoder = new TextEncoder();

        // Import the secret key
        const key = await getCryptoKey(secret);

        // Sign the raw body
        const computedSignature = await crypto.subtle.sign(
            "HMAC",
            key,
            encoder.encode(rawBody)
        );

        const expectedSignature = hexToBytes(normalizedSignature);

        // Compare lengths first to prevent errors in timingSafeEqual
        if (computedSignature.byteLength !== expectedSignature.byteLength) {
            return false;
        }

        return crypto.subtle.timingSafeEqual(computedSignature, expectedSignature);
    } catch (error) {
        // Log error in production for debugging
        console.error("Signature verification failed:", error);
        return false;
    }
}

/**
 * Helper: Convert Hex String to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
    if (hex.length % 2 !== 0) {
        throw new Error("Invalid hex string");
    }

    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
}

/**
 * Gets or creates a cached CryptoKey for the given secret.
 */
async function getCryptoKey(secret: string): Promise<CryptoKey> {
    // Return cached key if secret matches
    if (cachedKey && cachedSecret === secret) {
        return cachedKey;
    }

    // Import and cache the key
    const encoder = new TextEncoder();
    cachedKey = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        {name: "HMAC", hash: "SHA-256"},
        false,
        ["sign"]
    );
    cachedSecret = secret;

    return cachedKey;
}