#!/usr/bin/env node
import 'dotenv/config'
import { render } from 'ink'
import React from 'react'
import Init from './components/Init.js'
import acceptInvite from './commands/invite/AcceptInvite.js'
import createInvite from './commands/invite/CreateInvite.js'
import listInvites from './commands/invite/ListInvites.js'
import revokeInvite from './commands/invite/RevokeInvite.js'

const command = process.argv[2]
const projectNameArg = process.argv[3]

if (command === 'init') {
    render(React.createElement(Init, { projectName: projectNameArg }))
} else if (command === 'invite') {
    const subcommand = process.argv[3]
    const arg = process.argv[4]

    if (subcommand === 'create') {
        const noteArg = process.argv.find((value) => value.startsWith('--note='))
        const note = noteArg ? noteArg.replace('--note=', '') : undefined
        if (!arg) {
            console.error('Usage: regressionproof invite create <projectName> [--note=...]')
            process.exit(1)
        }
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
        console.error('Usage: regressionproof invite <create|accept|list|revoke>')
        process.exit(1)
    }
} else {
    console.log('Usage: regressionproof <command>')
    console.log('')
    console.log('Commands:')
    console.log('  init [projectName]    Initialize a new project')
    console.log('  invite ...            Manage project invites')
    process.exit(1)
}
