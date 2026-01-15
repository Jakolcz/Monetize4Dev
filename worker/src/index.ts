import {handleLemonSqueezyWebhook} from "../handlers/lemonsqueezy";
import {handleMavenResourceRequest} from "../handlers/maven";

export interface Env {
    LICENSES_KV: KVNamespace;
    DB: D1Database;
    FILES_BUCKET: R2Bucket;
    PRIVATE_KEY: string;
    WEBHOOK_SECRET: string;
    WEBHOOK_SALT: string;
    LEMON_SQUEEZY_WEBHOOK_SECRET: string;
}

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);
        if (url.pathname === '/webhook/lemonsqueezy') {
            return handleLemonSqueezyWebhook(request, env);
        }
        if (url.pathname.startsWith('/maven/')) {
            return handleMavenResourceRequest(request, env);
        }

        return new Response('Not Found', {status: 404});
    }
}