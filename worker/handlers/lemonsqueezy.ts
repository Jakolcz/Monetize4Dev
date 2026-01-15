import {Env} from "../src";
import {emailToStablePassword, textToSha256} from "../utils/crypto";
import {AccessDetails} from "../types/AccessDetails";

// TODO: Refactor to use KV
const resourceMap: { [key: number]: string } = {
    // TODO : Define product ID to resource ID mapping
    // Example:
    // 123456: "resource_abc",
    // 789012: "resource_def",
    1: "com/example/product1",
    2: "com/example/product2",
};

export async function handleLemonSqueezyWebhook(
    request: Request,
    env: Env
): Promise<Response> {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', {status: 405});
    }
    const signature = request.headers.get("X-Signature");
    if (!signature) {
        return new Response("Missing signature", {status: 400});
    }

    const rawBody = await request.text();

    // const signatureValid = await verifySignature(
    //     env.LEMON_SQUEEZY_WEBHOOK_SECRET,
    //     signature,
    //     rawBody
    // );

    // TODO : Uncomment signature verification in production
    // if (!signatureValid) {
    //     return new Response("Invalid signature", {status: 403});
    // }

    const payload = JSON.parse(rawBody);
    const eventName: string = payload.meta.event_name;

    if (eventName === "subscription_created") {
        return handleSubscriptionCreated(payload.data.attributes, env);
    }
    // TODO : Handle other event types as needed

    return new Response("Unsupported event", {status: 400});
}

async function handleSubscriptionCreated(
    payloadAttributes: any,
    env: Env
): Promise<Response> {
    if (!payloadAttributes) {
        return new Response("Invalid payload", {status: 400});
    }
    const status: string = payloadAttributes.status;
    if (status !== "active") {
        return new Response("Order not paid", {status: 402});
    }
    // TODO how to map products to resources?
    const resource = mapProductToResource(payloadAttributes.product_id);
    if (!resource) {
        // TODO notify admin about unmapped product
        return new Response("No resource mapped for product", {status: 404});
    }

    const email: string = payloadAttributes.user_email;

    await grantAccessToResource(
        email,
        resource,
        payloadAttributes.ends_at || payloadAttributes.renews_at,
        env
    );

    return new Response(null, {status: 200});
}

async function grantAccessToResource(
    email: string,
    resource: string,
    expiresAt: string,
    env: Env
): Promise<void> {
    const storage: KVNamespace<string> = env.LICENSES_KV;
    const entryKey = email.toLowerCase().trim();

    let existingEntryStr = await storage.get(entryKey);
    let kvEntry: AccessDetails = existingEntryStr ? JSON.parse(existingEntryStr) as AccessDetails : {resources: {}, accessType: "read"};

    if (!kvEntry.password) {
        // Double hash as first hash is sent to user to use for access, second is stored in KV
        kvEntry.password = await emailToStablePassword(email, env).then(textToSha256);
    }

    if (!kvEntry.resources[resource]) {
        kvEntry.resources[resource] = {expiresAt: expiresAt};
        console.log(`Granting access to resource ${resource} for ${email}. The entry: `, kvEntry);
        const updatedEntry = JSON.stringify(kvEntry);
        console.log("Updated entry: ", updatedEntry);
        return storage.put(entryKey, updatedEntry);
    }

    return Promise.resolve();
}


function mapProductToResource(productId: number): string | null {
    // TODO : Implement product to resource mapping
    return resourceMap[productId];
}