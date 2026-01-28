#!/usr/bin/env node
import 'dotenv/config'
import { render } from 'ink'
import React from 'react'
import acceptInvite from './commands/invite/AcceptInvite.js'
import createInvite from './commands/invite/CreateInvite.js'
import listInvites from './commands/invite/ListInvites.js'
import revokeInvite from './commands/invite/RevokeInvite.js'
import Init from './components/Init.js'
import DoctorOutput from './doctor/DoctorOutput.js'
import DoctorRunner from './doctor/DoctorRunner.js'

const command = process.argv[2]
const projectNameArg = process.argv[3]

if (command === 'init') {
    render(React.createElement(Init, { projectName: projectNameArg }))
} else if (command === 'invite') {
    const subcommand = process.argv[3]
    const arg = process.argv[4]

    if (subcommand === 'create') {
        const noteArg = process.argv.find((value) =>
            value.startsWith('--note=')
        )
        const note = noteArg ? noteArg.replace('--note=', '') : undefined
        void createInvite(arg, note)
    } else if (subcommand === 'accept') {
        if (!arg) {
            console.error('Usage: regressionproof invite accept <token>')
            process.exit(1)
        }
        void acceptInvite(arg)
    } else if (subcommand === 'list') {
        void listInvites(arg)
    } else if (subcommand === 'revoke') {
        if (!arg) {
            console.error('Usage: regressionproof invite revoke <token>')
            process.exit(1)
        }
        void revokeInvite(arg)
    } else {
        console.error(
            'Usage: regressionproof invite <create|accept|list|revoke>'
        )
        process.exit(1)
    }
} else if (command === 'doctor') {
    const options = parseDoctorArgs(process.argv.slice(3))
    void DoctorRunner.run({ cwd: options.cwd })
        .then((results) => {
            if (options.json) {
                console.log(JSON.stringify(results, null, 2))
            } else {
                DoctorOutput.print(results)
            }
            process.exit(DoctorOutput.exitCode(results))
        })
        .catch((err) => {
            const message = err instanceof Error ? err.message : String(err)
            console.error(message)
            process.exit(1)
        })
} else {
    console.log('Usage: regressionproof <command>')
    console.log('')
    console.log('Commands:')
    console.log('  init [projectName]    Initialize a new project')
    console.log('  invite ...            Manage project invites')
    console.log('  doctor                Check project configuration')
    process.exit(1)
}

function parseDoctorArgs(args: string[]): DoctorArgs {
    const options: DoctorArgs = { json: false }

    for (let i = 0; i < args.length; i++) {
        const arg = args[i]
        if (arg === '--json') {
            options.json = true
            continue
        }
        if (arg === '--cwd') {
            const value = args[i + 1]
            if (value) {
                options.cwd = value
                i++
            }
        }
    }

    return options
}

interface DoctorArgs {
    json: boolean
    cwd?: string
}
