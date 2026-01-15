export interface AccessDetails {
    password?: string;
    accessType: 'read' | 'write' | null;
    resources: {
        [resourceKey: string]: {
            expiresAt: string
        };
    };
}

export namespace AccessDetails {
    export function isResourceExpired(
        details: AccessDetails,
        resourceKey: string
    ): boolean {
        const resource = details.resources[resourceKey];
        if (!resource) return true;
        return new Date(resource.expiresAt) < new Date();
    }

    export function hasAccess(
        details: AccessDetails,
        resourceKey: string
    ): boolean {
        return !isResourceExpired(details, resourceKey);
    }
}