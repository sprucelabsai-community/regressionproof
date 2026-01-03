import AbstractSpruceTest, {
    test,
    suite,
    assert,
    generateId,
} from '@sprucelabs/test-utils'
import { RegressionProofApi } from '@regressionproof/api'
import {
    RegressionProofClient,
    ProjectCredentials,
} from '@regressionproof/client'

@suite()
export default class RegisteringProjectsTest extends AbstractSpruceTest {
    private static _api: RegressionProofApi
    private client!: RegressionProofClient

    protected static async beforeAll() {
        await super.beforeAll()
        this._api = new RegressionProofApi()
        await this._api.start()
    }

    protected static async afterAll() {
        await this._api.stop()
        await super.afterAll()
    }

    protected get api() {
        return RegisteringProjectsTest._api
    }

    protected async beforeEach() {
        await super.beforeEach()
        this.client = new RegressionProofClient(
            `http://localhost:${this.api.getPort()}`
        )
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
        assert.isTruthy(
            refreshed.token,
            'Expected refreshed credentials to include a token'
        )
        assert.isNotEqual(
            refreshed.token,
            original.token,
            'Expected refreshed token to be different from original'
        )
    }

    @test()
    protected async refreshingNonExistentProjectThrows() {
        await assert.doesThrowAsync(() => this.refreshCredentials(generateId()))
    }

    private async registerProject(name: string): Promise<ProjectCredentials> {
        return this.client.registerProject({ name })
    }

    private async refreshCredentials(
        name: string
    ): Promise<ProjectCredentials> {
        return this.client.refreshCredentials({ name })
    }
}
