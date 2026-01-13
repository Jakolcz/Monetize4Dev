import {verifySignature} from "../utils/crypto";
import {Env} from "../src";

const resourceMap: { [key: number]: string } = {
    // TODO : Define product ID to resource ID mapping
    // Example:
    // 123456: "resource_abc",
    // 789012: "resource_def",
    1: "com/example/product1",
};

export async function handleLemonSqueezyWebhook(
    request: Request,
    env: Env
): Promise<Response> {
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

    if (eventName === "order_created") {
        return handleOrderCreated(payload.data.attributes, env);
    }
    // TODO : Handle other event types as needed

    return new Response("Unsupported event", {status: 400});
}

async function handleOrderCreated(
    payloadAttributes: any,
    env: Env
): Promise<Response> {
    if (!payloadAttributes) {
        return new Response("Invalid payload", {status: 400});
    }
    const status: string = payloadAttributes.status;
    if (status !== "paid") {
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
        "TODO-LICENSE-KEY",
        env
    );

    return new Response(null, {status: 200});
}

async function grantAccessToResource(
    email: string,
    resource: string,
    license: string,
    env: Env
): Promise<void> {
    const storage: KVNamespace<string> = env.LICENSES_KV;
    const entryKey = await generateKey(`${email}:${license}`);

    console.log(`Checking access for ${email} to resource ${resource}, entryKey: ${entryKey}`);
    let existingEntry = await storage.get(entryKey).then(res => JSON.parse(res || "{\"resources\":[]}"));
    if (!existingEntry.resources[resource]) {
        existingEntry.resources[resource] = true;
        console.log(`Granting access to resource ${resource} for ${email}. Existing entry: `, existingEntry);
        const updatedEntry = JSON.stringify(existingEntry);
        await storage.put(entryKey, updatedEntry);
    }

    return Promise.resolve();
}
async function generateKey(data: string) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);

    // Convert ArrayBuffer to Hex String
    return [...new Uint8Array(hashBuffer)]
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}


function mapProductToResource(productId: number): string | null {
    // TODO : Implement product to resource mapping
    return resourceMap[productId] || "com/example/default";
}