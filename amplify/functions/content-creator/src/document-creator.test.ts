import sourceJson from '../test-resources/source.json'
import expectedDocument from '../test-resources/expected-document.json'
import { createDocument } from './document-creator'

describe('document-creator', () => {
    it('should create a document', () => {
        const document = createDocument(sourceJson, '/document-1234')
        expect(document).toEqual(expectedDocument.text)
    })
})