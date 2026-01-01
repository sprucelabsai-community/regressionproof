export interface RemoteOptions {
    /** Gitea repo URL to push to */
    url: string
    /** Gitea access token for authentication */
    token: string
}

export interface SnapshotOptions {
    /** Source project path to sync from. Defaults to process.cwd() */
    sourcePath?: string
    /** Mirror directory path where the isolated git repo lives */
    mirrorPath: string
    /** Path to metadata JSON file written by Spruce CLI */
    metadataPath: string
    /** Remote Gitea repo to push to */
    remote: RemoteOptions
}
