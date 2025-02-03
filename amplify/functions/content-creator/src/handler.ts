import { Logger } from '@aws-lambda-powertools/logger'
import { S3Service } from './s3-service'

process.env.POWERTOOLS_LOGGER_LOG_EVENT = 'true'

const logger = new Logger({ serviceName: 'contentCreator' })

const sourceBucket = '135151187374-backstage-docs-stg'

export const handler = async (event: any): Promise<void> => {
    logger.logEventIfEnabled(event)

    const destinationBucket = process.env.DESTINATION_BUCKET_NAME
    if(!destinationBucket) {
        logger.error('DESTINATION_BUCKET_NAME env not defined', { env: process.env })
        return
    }

    const sourceBucket = process.env.SOURCE_BUCKET_NAME
    if(!sourceBucket) {
        logger.error('SOURCE_BUCKET_NAME env not defined', { env: process.env })
        return
    }

    try{
        const service = new S3Service(sourceBucket)
        await service.processAndStoreObjects(destinationBucket)
        logger.info('success')
    } catch (error) {
        logger.error('failed to process and store objects', { error })
    }
}