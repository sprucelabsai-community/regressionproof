import { execSync } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'
import type { TypeCheckError } from '@regressionproof/snapshotter'

export function captureTypeErrors(projectRoot: string): TypeCheckError[] {
    const tsconfigPath = path.join(projectRoot, 'tsconfig.json')

    if (!existsSync(tsconfigPath)) {
        return []
    }

    try {
        execSync('tsc --noEmit --pretty false', {
            cwd: projectRoot,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
        })
        return []
    } catch (err) {
        const error = err as { stdout?: string; stderr?: string }
        const output = error.stdout || error.stderr || ''
        return parseTypeScriptErrors(output, projectRoot)
    }
}

function parseTypeScriptErrors(
    output: string,
    projectRoot: string
): TypeCheckError[] {
    const errors: TypeCheckError[] = []
    const lines = output.split('\n')

    for (const line of lines) {
        const match = line.match(
            /^(.+)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)$/
        )
        if (match) {
            const [, filePath, lineStr, colStr, code, message] = match
            const relativePath = path.isAbsolute(filePath)
                ? path.relative(projectRoot, filePath)
                : filePath

            errors.push({
                file: relativePath,
                line: parseInt(lineStr, 10),
                column: parseInt(colStr, 10),
                code,
                message,
            })
        }
    }

    return errors
}
