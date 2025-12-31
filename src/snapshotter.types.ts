export interface SnapshotOptions {
    /** Source project path to sync from. Defaults to process.cwd() */
    source?: string
    /** Mirror directory path where the isolated git repo lives */
    mirror: string
    /** Path to metadata JSON file written by Spruce CLI */
    metadata: string
}
