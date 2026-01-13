export enum AccessType {
    READ = 'GET',
    WRITE = 'POST',
}

export interface License {
    email: string;
    licenseKey: string;
    accessType: AccessType;
    expirationDate?: string;
}

export async function createLicense(test: License): Promise<string> {
    return "";
}