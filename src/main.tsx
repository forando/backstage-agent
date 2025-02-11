import ReactDOM from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import App from './App.tsx'
import './main.css'
import outputs from '../amplify_outputs.json'

Amplify.configure(outputs)

/*import { CONNECTION_STATE_CHANGE, ConnectionState } from 'aws-amplify/data'
import { Hub } from 'aws-amplify/utils'

Hub.listen('api', (data: any) => {
    const { payload } = data;
    if (payload.event === CONNECTION_STATE_CHANGE) {
        const connectionState = payload.data.connectionState as ConnectionState;
        console.log(connectionState);
    }
});*/

ReactDOM.createRoot(document.getElementById('root')!).render(
    // <React.StrictMode>
    <App />
    // </React.StrictMode>,
)
