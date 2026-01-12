import { SchemaRegistry } from '@sprucelabs/schema'
import { SpruceErrors } from '../errors.types'



const gitServerErrorSchema: SpruceErrors.RegressionproofClient.GitServerErrorSchema  = {
	id: 'gitServerError',
	namespace: 'RegressionproofClient',
	name: 'git server error',
	    fields: {
	            /** . */
	            'message': {
	                type: 'text',
	                isRequired: true,
	                options: undefined
	            },
	    }
}

SchemaRegistry.getInstance().trackSchema(gitServerErrorSchema)

export default gitServerErrorSchema
