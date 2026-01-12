import { default as SchemaEntity } from '@sprucelabs/schema'
import * as SpruceSchema from '@sprucelabs/schema'





export declare namespace SpruceErrors.RegressionproofClient {

	
	export interface GitServerError {
		
			
			'message': string
	}

	export interface GitServerErrorSchema extends SpruceSchema.Schema {
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

	export type GitServerErrorEntity = SchemaEntity<SpruceErrors.RegressionproofClient.GitServerErrorSchema>

}




