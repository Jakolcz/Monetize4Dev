import {Env} from "../src";
import {AccessDetails} from "../types/AccessDetails";
import {textToSha256} from "../utils/crypto";

type Storages = {
    access: KVNamespace;
    r2: R2Bucket;
}

type AuthResult = {
    user: string;
    access: AccessDetails | null;
}

export async function handleMavenResourceRequest(request: Request, env: Env): Promise<Response> {
    if (request.method === 'PUT') {
        return handleMavenUpload(request, env);
    }

    if (request.method === 'GET') {
        return handleMavenDownload(request, env);
    }

    if (request.method === 'HEAD') {
        return handleMavenMetadata(request, env);
    }

    return new Response("Maven resource handler not implemented yet", {status: 501});
}

async function handleMavenUpload(request: Request, env: Env): Promise<Response> {
    console.log("Handling Maven upload request");
    const authResult: AuthResult = await handleAuth(request, env.LICENSES_KV);
    console.log("Auth result: ", authResult);
    if (!authResult.access) {
        return createUnauthorizedResponse();
    }
    if (authResult.access.accessType !== 'write') {
        return new Response("Forbidden", {status: 403});
    }

    const r2 = env.FILES_BUCKET;
    const url = new URL(request.url);
    const objectKey = url.pathname.replace('/maven/', '');
    console.log("Headers: ", Array.from(request.headers.entries()));
    const contentType = request.headers.get('Content-Type') || 'application/octet-stream';
    const putResult = await r2.put(objectKey, request.body, {
        httpMetadata: {
            contentType: contentType,
        },
    });
    console.log("Uploaded object to R2: ", objectKey, " Result: ", putResult);
    return new Response("Uploaded", {status: 201});
}

async function handleMavenDownload(request: Request, env: Env): Promise<Response> {
    const authResult: AuthResult = await handleAuth(request, env.LICENSES_KV);
    if (!authResult.access || authResult.access.accessType === null) {
        return createUnauthorizedResponse();
    }

    const r2 = env.FILES_BUCKET;
    const url = new URL(request.url);
    const objectKey = url.pathname.replace('/maven/', '');
    const object = await r2.get(objectKey);
    if (object) {
        const headers = new Headers();
        headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
        headers.set('Content-Length', object.size.toString());
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        headers.set('ETag', object.etag);
        console.log("Serving object from R2: ", objectKey);
        console.log("Headers: ", Array.from(headers.entries()));
        return new Response(object.body, {status: 200, headers});
    }

    console.log("Object not found in R2: ", objectKey);
    return new Response("Not Found", {status: 404});
}

async function handleMavenMetadata(request: Request, env: Env): Promise<Response> {
    return new Response("Maven metadata not implemented yet", {status: 501});
}

/**
 * Creates a 401 Unauthorized response with the appropriate WWW-Authenticate header.
 */
function createUnauthorizedResponse(): Response {
    return new Response("Unauthorized", {
        status: 401,
        headers: {
            'WWW-Authenticate': 'Basic realm="Maven Repository"'
        }
    });
}

function getStorages(env: Env): Storages {
    return {
        access: env.LICENSES_KV,
        r2: env.FILES_BUCKET,
    };
}

async function handleAuth(request: Request, access: KVNamespace<string>): Promise<AuthResult> {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Basic ")) {
        console.log("No Authorization header or not Basic. Header: ", authHeader);
        console.log("Request headers: ", Array.from(request.headers.entries()));
        return {user: "", access: null};
    }

    try {
        const base64Credentials = authHeader.slice("Basic ".length);
        const credentials = atob(base64Credentials);
        const [username, password] = credentials.split(":");

        const kvData = await access.get(username);
        if (!kvData) {
            console.log("No KV data for user: ", username);
            return {user: "", access: null};
        }

        const accessDetails: AccessDetails = JSON.parse(kvData) as AccessDetails;
        if (accessDetails.password !== await textToSha256(password)) {
            console.log("Password mismatch for user: ", username);
            return {user: "", access: null};
        }

        return {user: username, access: accessDetails};
    } catch {
        console.log("Error during authentication");
        return {user: "", access: null};
    }
}