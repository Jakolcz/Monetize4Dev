export interface Env {
    // LemonSqueezy Webhook Secret
    LEMON_SQUEEZY_WEBHOOK_SECRET: string;

}

interface TestData {
    message: string;
}

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        if (request.method !== 'POST') {
            return new Response('Method Not Allowed', {status: 405});
        }

        const data: TestData = await request.json();
        return new Response(`Received message: ${data.message}`, {status: 200});
    }
}