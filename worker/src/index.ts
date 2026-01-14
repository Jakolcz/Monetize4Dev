import {handleLemonSqueezyWebhook} from "../handlers/lemonsqueezy";

export interface Env {
    LICENSES_KV: KVNamespace;
    DB: D1Database;
    PRIVATE_KEY: string;
    WEBHOOK_SECRET: string;
    WEBHOOK_SALT: string;
    LEMON_SQUEEZY_WEBHOOK_SECRET: string;
}

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        if (request.method !== 'POST') {
            return new Response('Method Not Allowed', {status: 405});
        }

        const url = new URL(request.url);
        if (url.pathname === '/webhook/lemonsqueezy') {
            return handleLemonSqueezyWebhook(request, env);
        }

        return new Response('Not Found', {status: 404});
    }
}