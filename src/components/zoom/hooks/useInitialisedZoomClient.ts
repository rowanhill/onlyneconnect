import ZoomVideo from '@zoom/videosdk';
import { useEffect, useState } from 'react';
import { ZoomClient } from '../zoomTypes';

export const useInitialisedZoomClient = () => {
    const [zoomClient, setZoomClient] = useState<ZoomClient|null>(null);
    
    // Create and initialise the client on mount, destroy it on unmount
    useEffect(() => {
        const client = ZoomVideo.createClient();

        // Init the client with 'Global' - i.e. Zoom hosted assets
        client.init('en-GB', 'Global').then(() => {
            // Set the state once init is complete
            setZoomClient(client);
        });

        return () => { ZoomVideo.destroyClient(); };
    }, []);

    return zoomClient;
};