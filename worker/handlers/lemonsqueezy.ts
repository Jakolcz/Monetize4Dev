import {verifySignature} from "../utils/crypto";
import {Env} from "../src";

export async function handleLemonSqueezyWebhook(
    request: Request,
    env: Env
): Promise<Response> {
    const signature = request.headers.get("X-Signature");
    if (!signature) {
        return new Response("Missing signature", {status: 400});
    }

    const rawBody = await request.text();

    const signatureValid = await verifySignature(
        env.LEMON_SQUEEZY_WEBHOOK_SECRET,
        signature,
        rawBody
    );

    // TODO : Uncomment signature verification in production
    // if (!signatureValid) {
    //     return new Response("Invalid signature", {status: 403});
    // }

    const payload = JSON.parse(rawBody);
    const eventName: string = payload.meta.event_name;

    if (eventName !== "order_created") {
        return new Response("Unsupported event", {status: 400});
    }
    // TODO validate that the payload is paid and everything is good

    const email: string = payload.data.attributes.customer_email;

    return new Response(null, {status: 200});
}