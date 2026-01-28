import fs from 'fs'
import os from 'os'
import path from 'path'

export default class DoctorContext {
    public constructor(
        public cwd: string,
        public projectName: string | null,
        public localConfigPath: string | null,
        public homeConfigDir: string
    ) {}

    public static fromCwd(cwd: string): DoctorContext {
        const localConfigPath = path.join(cwd, '.regressionproof.json')
        const localExists = fs.existsSync(localConfigPath)
        const projectName = localExists
            ? DoctorContext.readProjectName(localConfigPath)
            : null

        const homeConfigDir = path.join(os.homedir(), '.regressionproof')

        return new DoctorContext(
            cwd,
            projectName,
            localExists ? localConfigPath : null,
            homeConfigDir
        )
    }

    public get configDir(): string | null {
        return this.projectName
            ? path.join(this.homeConfigDir, this.projectName)
            : null
    }

    public get credentialsPath(): string | null {
        return this.configDir ? path.join(this.configDir, 'config.json') : null
    }

    public get mirrorPath(): string | null {
        return this.configDir ? path.join(this.configDir, 'mirror') : null
    }

    private static readProjectName(localConfigPath: string): string | null {
        try {
            const raw = JSON.parse(fs.readFileSync(localConfigPath, 'utf-8'))
            return raw.projectName ?? null
        } catch {
            return null
        }
    }
}
