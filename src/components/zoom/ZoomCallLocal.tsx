import { useRef, useState } from 'react';
import { useHostBroadcast } from './hooks/useHostBroadcast';
import { useInitialisedZoomClient } from './hooks/useInitialisedZoomClient';
import { useLocalAudioVideo } from './hooks/useLocalAudioVideo';
import { videoDimensions } from './videoConfig';
import { ZoomClient } from './zoomTypes';

export const ZoomCallLocal = () => {
    const zoomClient = useInitialisedZoomClient();

    if (zoomClient) {
        return <ZoomCallLocalInitialised zoomClient={zoomClient} />;
    } else {
        return <ZoomCallLocalUninitialised />;
    }
};

const ZoomCallLocalUninitialised = () => {
    return (
        <>
        <video {...videoDimensions}
            style={{
                visibility: 'hidden',
                transform: 'scale(-1, 1)',
                width: '100%',
                height: 'auto',
            }}
        ></video>
        <div>
            <button disabled={true}>Loading...</button>
        </div>
        </>
    );
};

const ZoomCallLocalInitialised = ({ zoomClient }: { zoomClient: ZoomClient }) => {
    const [broadcastState, setBroadcastState] = useState<'off'|'previewing'|'connecting'|'on'>('off');
    const videoRef = useRef<HTMLVideoElement|null>(null);
    useLocalAudioVideo(broadcastState === 'previewing', videoRef);
    const hostBroadcast = useHostBroadcast(zoomClient, videoRef);

    const startPreview = () => {
        setBroadcastState('previewing');
    };
    const stopPreview = () => {
        setBroadcastState('off');
    }
    const startBroadcast = () => {
        setBroadcastState('connecting');
        const didStartSession = { flag: false };
        hostBroadcast.joinCall(didStartSession)
            .finally(() => setBroadcastState(didStartSession.flag ? 'on' : 'off'));
    };
    const stopBroadcast = () => {
        hostBroadcast.endCall()
            .then(() => setBroadcastState('off'));
    };

    return (
        <>
        <video
            ref={videoRef}
            {...videoDimensions}
            style={{
                visibility: broadcastState === 'off' ? 'hidden' : 'initial',
                transform: 'scale(-1, 1)',
                width: '100%',
                height: 'auto',
            }}
        />
        <div>
            {broadcastState === 'off' && <button onClick={startPreview}>Preview video</button>}
            {broadcastState === 'previewing' && <button onClick={stopPreview}>Stop preview</button>}
            {broadcastState === 'previewing' && <button onClick={startBroadcast}>Start broadcast</button>}
            {broadcastState === 'connecting' && <button disabled={true}>Connecting...</button>}
            {broadcastState === 'on' && <button onClick={stopBroadcast}>Stop broadcast</button>}
        </div>
        </>
    );
};