import 'dotenv/config'
import path from 'path'
import RegressionProofApi from './RegressionProofApi.js'
import { openDb } from './db/index.js'
import { InvitesStore } from './stores/index.js'

const PORT = parseInt(process.env.API_PORT ?? '3000')
const HOST = process.env.API_HOST ?? '0.0.0.0'
const GITEA_URL = process.env.GITEA_URL ?? 'http://localhost:3333'
const API_DB_PATH =
    process.env.API_DB_PATH ?? path.join(process.cwd(), 'data.sqlite')
const GITEA_ADMIN_USER = process.env.GITEA_ADMIN_USER ?? 'admin'
const GITEA_ADMIN_PASSWORD = process.env.GITEA_ADMIN_PASSWORD

if (!GITEA_ADMIN_PASSWORD) {
    console.error('Error: GITEA_ADMIN_PASSWORD is required')
    process.exit(1)
}

const db = openDb(API_DB_PATH)
const invitesStore = new InvitesStore(db)

const api = new RegressionProofApi({
    giteaUrl: GITEA_URL,
    giteaAdminUser: GITEA_ADMIN_USER,
    giteaAdminPassword: GITEA_ADMIN_PASSWORD,
    invitesStore,
})

api.start(PORT, HOST)
    .then(() => {
        console.log(`API server running on http://${HOST}:${api.getPort()}`)
        console.log(`Connected to Gitea at ${GITEA_URL}`)
    })
    .catch((err) => {
        console.error('Failed to start API:', err.message)
        process.exit(1)
    })
