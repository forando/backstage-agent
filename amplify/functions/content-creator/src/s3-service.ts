import {
    GetObjectCommand,
    ListObjectsV2Command,
    S3Client,
} from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import {_Object} from '@aws-sdk/client-s3/dist-types/models/models_0'
import { Readable } from 'stream'

import { createDocument, SearchIndex } from './document-creator'

export class S3Service {
    private readonly client: S3Client

    constructor(private readonly sourceBucket: string) {
        this.client = new S3Client()
    }

    async processAndStoreObjects(destinationBucket: string): Promise<void> {
        const keys = await this.listAllObjects()
        for (const key of keys) {
            const content = await this.readObject(this.sourceBucket, key)
            const index: SearchIndex = JSON.parse(content)
            const prefix = this.parsePrefix(key)
            const document = createDocument(index, `/${prefix}`)
            const targetKey = this.generateNewKey(prefix)
            await this.storeObject(destinationBucket, targetKey, document)
        }
    }

    private async listAllObjects(): Promise<string[]> {
        const objects: string[] = []
        let continuationToken: string | undefined
        do {
            const command = new ListObjectsV2Command({
                Bucket: this.sourceBucket,
                ContinuationToken: continuationToken,
            })
            const response = await this.client.send(command)
            const searchIndexList = response
                .Contents?.filter(this.isSearchIndex).map((object) => object.Key!) || []
            objects.push(...searchIndexList)
            continuationToken = response.NextContinuationToken
        } while (continuationToken)
        return objects
    }

    private async readObject(bucket: string, key: string): Promise<string> {
        const command = new GetObjectCommand({ Bucket: bucket, Key: key })
        const response = await this.client.send(command)
        const stream = response.Body as Readable
        let data = ''
        stream.setEncoding('utf-8')
        for await (const chunk of stream) {
            data += chunk
        }
        return data
    }

    private async storeObject(bucket: string, key: string, content: string): Promise<void> {
        const trimmedContent = content
            .split('\n')
            .map(line => line.trimStart())
            .join('\n')

        const upload = new Upload({
            client: this.client,
            params: {
                Bucket: bucket,
                Key: key,
                Body: trimmedContent,
            },
        })
        await upload.done()
    }

    /**
     * given the key = `default/api/category_tree_v2/search/search_index.json`
     * remove `/search/search_index.json` to get the prefix
     */
    parsePrefix(key: string): string {
        return key.replace(/\/search\/search_index.json$/, '')
    }

    /**
     * given the prefix = `default/api/category_tree_v2`
     * generate a new key `default#api#category_tree_v2.md`
     */
    generateNewKey(prefix: string): string {
        return `${prefix.replace(/\//g, '#')}.md`
    }

    private isSearchIndex(object: _Object): boolean {
        return object.Key?.endsWith('search_index.json') || false
    }
}