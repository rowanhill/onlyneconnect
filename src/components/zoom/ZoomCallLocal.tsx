import { useRef, useState } from 'react';
import { DangerButton, PrimaryButton } from '../../Button';
import { useDisconnectAfterTimeout } from './hooks/useDisconnectAfterTimeout';
import { useHostBroadcast } from './hooks/useHostBroadcast';
import { useInitialisedZoomClient } from './hooks/useInitialisedZoomClient';
import { useLocalAudioVideo } from './hooks/useLocalAudioVideo';
import { videoDimensions } from './videoConfig';
import { ZoomCallTimeoutModal } from './ZoomCallTimeoutModal';
import { ZoomClient } from './zoomTypes';
import styles from './ZoomCallLocal.module.css';

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
        <video
            {...videoDimensions}
            className={styles.selfVideo}
            style={{ visibility: 'hidden' }}
        />
        <div>
            <PrimaryButton disabled={true}>Loading...</PrimaryButton>
        </div>
        </>
    );
};

const ZoomCallLocalInitialised = ({ zoomClient }: { zoomClient: ZoomClient }) => {
    const [broadcastState, setBroadcastState] = useState<'off'|'previewing'|'connecting'|'on'>('off');
    const videoRef = useRef<HTMLVideoElement|null>(null);
    const localAv = useLocalAudioVideo(broadcastState === 'previewing', videoRef);
    const localAvLive = !!localAv.localAudioTrack && !!localAv.localVideoTrack
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

    const { showTimeoutModal, postponeTimeoutThirtyMinutes } = useDisconnectAfterTimeout(
        broadcastState === 'on',
        zoomClient,
        stopBroadcast,
    );

    return (
        <>
        <video
            ref={videoRef}
            {...videoDimensions}
            className={styles.selfVideo}
            style={{ visibility: broadcastState === 'off' ? 'hidden' : 'initial' }}
        />
        <div>
            {broadcastState === 'off' && <PrimaryButton onClick={startPreview}>Preview video</PrimaryButton>}
            {broadcastState === 'previewing' && <DangerButton onClick={stopPreview} disabled={!localAvLive}>Stop preview</DangerButton>}
            {broadcastState === 'previewing' && <PrimaryButton onClick={startBroadcast} disabled={!localAvLive}>Start broadcast</PrimaryButton>}
            {broadcastState === 'connecting' && <PrimaryButton disabled={true}>Connecting...</PrimaryButton>}
            {broadcastState === 'on' && <DangerButton onClick={stopBroadcast}>Stop broadcast</DangerButton>}
        </div>
        {showTimeoutModal && <ZoomCallTimeoutModal onStayConnected={postponeTimeoutThirtyMinutes} onDisconnect={stopBroadcast} />}
        </>
    );
};