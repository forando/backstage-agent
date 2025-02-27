/**
 * By default, cdk generates very long cryptic names for resources.
 * This function generates a more human-readable name for a resource.
 * @param name The name of the resource
 */
export const nameFor = (name: string): string => {
    const contextStr = process.env.CDK_CONTEXT_JSON
    if(!contextStr) {
        throw new Error('CDK_CONTEXT_JSON is not defined');
    }
    const context = JSON.parse(contextStr)
    const backendType = context['amplify-backend-type']
    if(backendType === 'sandbox') {
        const backendNameLimit = 14;
        let backendName = context['amplify-backend-name'].replace(/\./g, '');
        if(backendName.length > backendNameLimit) {
            backendName = backendName.substring(0, backendNameLimit)
        }
        return `sandbox-backstageagent-${backendName}-${name}`
    }
    return `backstageagent-${name}`
}