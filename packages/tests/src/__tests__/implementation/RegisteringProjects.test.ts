import AbstractSpruceTest, {
    test,
    suite,
    assert,
    errorAssert,
    generateId,
} from '@sprucelabs/test-utils'
import {
    RegressionProofApi,
    Database,
    InvitesStore,
} from '@regressionproof/api'
import type { RegressionProofClient } from '@regressionproof/client'
import {
    ProjectCredentials,
    buildRegressionProofClient,
} from '@regressionproof/client'

@suite()
export default class RegisteringProjectsTest extends AbstractSpruceTest {
    private static api: RegressionProofApi
    private client!: RegressionProofClient

    protected static async beforeAll() {
        await super.beforeAll()
        this.api = new RegressionProofApi({
            giteaUrl: process.env.GITEA_URL!,
            giteaAdminUser: process.env.GITEA_ADMIN_USER!,
            giteaAdminPassword: process.env.GITEA_ADMIN_PASSWORD!,
            invitesStore: this.createInvitesStore(),
        })
        await this.api.start()
    }

    protected static async afterAll() {
        await this.api.stop()
        await super.afterAll()
    }

    protected get api() {
        return RegisteringProjectsTest.api
    }

    protected async beforeEach() {
        await super.beforeEach()
        this.client = buildRegressionProofClient(
            `http://localhost:${this.api.getPort()}`
        )
    }

    @test()
    protected async checkNameIsAvailableToStart() {
        const name = generateId()
        const isAvailable = await this.checkNameAvailability(name)
        assert.isTrue(isAvailable)
    }

    @test()
    protected async checkNameIsNotAvailableAfterRegistration() {
        const name = generateId()
        await this.registerProject(name)
        const isAvailable = await this.checkNameAvailability(name)
        assert.isFalse(isAvailable)
    }

    @test()
    protected async nameAvailabilityIsSharedAcrossApiInstances() {
        const name = generateId()
        await this.registerProject(name)

        const secondApi = this.Api()
        await secondApi.start()

        const secondClient = this.Client(secondApi)
        const isAvailable = await secondClient.checkNameAvailability(name)
        assert.isFalse(
            isAvailable,
            'Name should not be available in second API instance'
        )

        await secondApi.stop()
    }

    @test()
    protected async canRegisterAProjectAndGetCredentials() {
        const name = generateId()

        const credentials = await this.registerProject(name)

        assert.isTruthy(
            credentials.url,
            'Expected credentials to include a url'
        )
        assert.isTruthy(
            credentials.token,
            'Expected credentials to include a token'
        )
        assert.doesInclude(
            credentials.url,
            name,
            'Expected url to include project name'
        )
    }

    @test()
    protected async canRefreshCredentialsForExistingProject() {
        const name = generateId()

        const original = await this.registerProject(name)
        const refreshed = await this.refreshCredentials(name)

        assert.isEqual(
            refreshed.url,
            original.url,
            'Expected url to remain the same after refresh'
        )
        assert.isNotEqual(
            refreshed.token,
            original.token,
            'Expected refreshed token to be different from original'
        )
    }

    @test()
    protected async refreshingNonExistentProjectThrows() {
        await this.assertThrowsProjectNotFound(generateId())
    }

    @test()
    protected async registeringWithUnreachableGiteaReturnsHelpfulError() {
        const url = 'http://localhost:59999'
        const badApi = this.Api({ giteaUrl: url })
        await badApi.start()

        const badClient = this.Client(badApi)
        const err = await assert.doesThrowAsync(() =>
            badClient.registerProject({ name: generateId() })
        )

        errorAssert.assertError(err, 'GIT_SERVER_UNAVAILABLE', { url })

        await badApi.stop()
    }

    @test()
    protected async registeringDuplicateProjectThrows() {
        const name = generateId()
        await this.registerProject(name)
        await this.assertThrowsProjectAlreadyExists(name)
    }

    @test()
    protected async registeringWithInvalidNameThrows() {
        const invalidNames = [
            'My Project',
            'has spaces',
            'UPPERCASE',
            'special@chars!',
        ]

        for (const name of invalidNames) {
            await this.assertThrowsInvalidProjectName(name)
        }
    }

    @test()
    protected async registeredTokenWorksWithGitea() {
        const name = generateId()
        const credentials = await this.registerProject(name)

        const response = await fetch(`${process.env.GITEA_URL}/api/v1/user`, {
            headers: { Authorization: `token ${credentials.token}` },
        })

        assert.isEqual(
            response.status,
            200,
            'Expected token to authenticate with Gitea'
        )
    }

    private async checkNameAvailability(name: string): Promise<boolean> {
        return this.client.checkNameAvailability(name)
    }

    private async registerProject(name: string): Promise<ProjectCredentials> {
        return this.client.registerProject({ name })
    }

    private async refreshCredentials(
        name: string
    ): Promise<ProjectCredentials> {
        return this.client.refreshCredentials({ name })
    }

    private async assertThrowsProjectNotFound(name: string): Promise<void> {
        const err = await assert.doesThrowAsync(() =>
            this.refreshCredentials(name)
        )
        errorAssert.assertError(err, 'PROJECT_NOT_FOUND', { name })
    }

    private async assertThrowsProjectAlreadyExists(
        name: string
    ): Promise<void> {
        const err = await assert.doesThrowAsync(() =>
            this.registerProject(name)
        )
        errorAssert.assertError(err, 'PROJECT_ALREADY_EXISTS', { name })
    }

    private async assertThrowsInvalidProjectName(name: string): Promise<void> {
        const err = await assert.doesThrowAsync(() =>
            this.registerProject(name)
        )
        errorAssert.assertError(err, 'INVALID_PROJECT_NAME', { name })
    }

    private Api(
        options?: Partial<{
            giteaUrl: string
            giteaAdminUser: string
            giteaAdminPassword: string
        }>
    ): RegressionProofApi {
        return new RegressionProofApi({
            giteaUrl: options?.giteaUrl ?? process.env.GITEA_URL!,
            giteaAdminUser:
                options?.giteaAdminUser ?? process.env.GITEA_ADMIN_USER!,
            giteaAdminPassword:
                options?.giteaAdminPassword ??
                process.env.GITEA_ADMIN_PASSWORD!,
            invitesStore: this.createInvitesStore(),
        })
    }

    private Client(api: RegressionProofApi): RegressionProofClient {
        return buildRegressionProofClient(`http://localhost:${api.getPort()}`)
    }

    private static createInvitesStore(): InvitesStore {
        return new InvitesStore(new Database(':memory:'))
    }

    private createInvitesStore(): InvitesStore {
        return RegisteringProjectsTest.createInvitesStore()
    }
}
