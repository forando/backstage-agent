import { S3Service } from './s3-service'

describe('s3-service', () => {
    it('should parse the prefix correctly', () => {
        const service = new S3Service('test-bucket')
        const key = 'default/api/category_tree_v2/search/search_index.json'
        const prefix = service.parsePrefix(key)
        expect(prefix).toEqual('default/api/category_tree_v2')
    })
    it('should generate new key', () => {
        const service = new S3Service('test-bucket')
        const prefix = 'default/api/category_tree_v2'
        const key = service.generateNewKey(prefix)
        expect(key).toEqual('default#api#category_tree_v2.md')
    })
})