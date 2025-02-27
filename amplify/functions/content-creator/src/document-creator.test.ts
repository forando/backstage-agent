import searchIndex from '../test-resources/search_index.json'
import expectedDocument from '../test-resources/expected-document.json'
import { createDocument } from './document-creator'

describe('document-creator', () => {
    it('should create a document', () => {
        const document = createDocument(searchIndex, '/document-1234')
        expect(document).toEqual(expectedDocument.text)
    })
})