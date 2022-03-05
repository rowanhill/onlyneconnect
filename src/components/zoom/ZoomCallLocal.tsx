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
import { useRenderVideoOfHost } from './hooks/useRenderVideoOfHost';
import { useDeviceLists } from './hooks/useDeviceLists';
import { AvDeviceSelect } from './AvDeviceSelect';

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
    const videoCanvasRef = useRef<HTMLCanvasElement|null>(null);
    const deviceLists = useDeviceLists({ audio: true, video: true });
    const localAv = useLocalAudioVideo(
        broadcastState === 'previewing',
        videoRef,
        deviceLists.cameras.selected?.deviceId,
        deviceLists.mics.selected?.deviceId,
    );
    const localAvLive = !!localAv.localAudioTrack && !!localAv.localVideoTrack;
    const { joinCall, endCall, mediaStream } = useHostBroadcast(
        zoomClient,
        deviceLists.cameras.selected?.deviceId,
        deviceLists.mics.selected?.deviceId,
        deviceLists.speakers.selected?.deviceId,
    );
    useRenderVideoOfHost(mediaStream, zoomClient, videoCanvasRef);
    const [showDeviceLists, setShowDeviceLists] = useState(false);

    const startPreview = () => {
        setBroadcastState('previewing');
    };
    const stopPreview = () => {
        setBroadcastState('off');
    }
    const startBroadcast = () => {
        setBroadcastState('connecting');
        const didStartSession = { flag: false };
        joinCall(didStartSession)
            .finally(() => setBroadcastState(didStartSession.flag ? 'on' : 'off'));
    };
    const stopBroadcast = () => {
        endCall()
            .then(() => setBroadcastState('off'));
    };

    const { showTimeoutModal, postponeTimeoutThirtyMinutes } = useDisconnectAfterTimeout(
        broadcastState === 'on',
        zoomClient,
        stopBroadcast,
    );

    return (
        <>
        {!mediaStream && <video
            ref={videoRef}
            {...videoDimensions}
            className={styles.selfVideo}
            style={{ visibility: broadcastState === 'off' ? 'hidden' : 'initial' }}
        />}
        {mediaStream && <canvas
            ref={videoCanvasRef}
            {...videoDimensions}
            className={styles.selfVideo}
            style={{ visibility: broadcastState === 'off' ? 'hidden' : 'initial' }}
        />}
        {showDeviceLists && <>
        <div><AvDeviceSelect className={styles.deviceList} deviceList={deviceLists.cameras} /></div>
        <div><AvDeviceSelect className={styles.deviceList} deviceList={deviceLists.mics} /></div>
        <div><AvDeviceSelect className={styles.deviceList} deviceList={deviceLists.speakers} /></div>
        </>}
        <div>
            <PrimaryButton onClick={() => setShowDeviceLists(!showDeviceLists)}>⚙️</PrimaryButton>
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