import BaseSpruceError from '@sprucelabs/error'
import ErrorOptions from '#spruce/errors/options.types'

export default class SpruceError extends BaseSpruceError<ErrorOptions> {
    /** an easy to understand version of the errors */
    public friendlyMessage(): string {
        const { options } = this
        let message
        switch (options?.code) {
            case 'PROJECT_ALREADY_EXISTS':
                message = `A project named '${options.name}' already exists on the Git server. Choose a different name or refresh credentials.`
                break

            case 'PROJECT_NOT_FOUND':
                message = `Project '${options.name}' was not found on the Git server. Check the name or register the project first.`
                break

            case 'GIT_SERVER_UNAVAILABLE':
                message = `Could not connect to the Git server at ${options.url}. Check the URL, network connectivity, and server availability.`
                break

            case 'GIT_SERVER_ERROR':
                message = `Git server error while processing the request: ${options.message}`
                break

            default:
                message = super.friendlyMessage()
        }

        const fullMessage = options.friendlyMessage
            ? options.friendlyMessage
            : message

        return fullMessage
    }
}
