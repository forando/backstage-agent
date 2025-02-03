export type IndexNode = {
    location: string;
    title: string;
    text: string;
}
export type SearchIndex = {
    config: any;
    docs: IndexNode[];
}

/**
 * The base url of the backstage instance.
 * TODO: This should be configurable.
 */
const baseUrl = "https://backstage-stg.idealo.tools/docs"

/**
 * Creates a document from the search index.
 * Search index has text in chunks which prevents LLM from processing it as a single document.
 * This is bad as LLM will not be able to understand the context of the document.
 * This function concatenates the text chunks into a single document.
 * It also adds links to the text location in the backstage so that LLM can provide them back for users.
 * @param index the search index json
 * @param prefix the prefix to be added to the document link
 */
export const createDocument = (index: SearchIndex, prefix: string): string => {
    return index.docs.reduce((acc: string, node: IndexNode) => {
        if (node.text) {
            return concatenateWithLink(acc, node, prefix);
        } else {
            return concatenateTitle(acc, node);
        }
    }, "");
};

const concatenateWithLink = (acc: string, node: IndexNode, prefix: string): string => {
    const documentUrl = `${baseUrl}${prefix}`;
    const link = `[${node.title}](${documentUrl}/${node.location})`
    return `${acc}
    ${node.title}\n
    Backstage link: ${link}\n
    ${node.text}
    `
}

const concatenateTitle = (acc: string, node: IndexNode): string => {
    return `${acc}
    ${node.title}
    `
}