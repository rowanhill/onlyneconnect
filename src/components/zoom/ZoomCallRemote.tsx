import { useRef, useState } from 'react';
import { DangerButton, PrimaryButton } from '../../Button';
import { useQuizContext } from '../../contexts/quizPage';
import { useDisconnectAfterTimeout } from './hooks/useDisconnectAfterTimeout';
import { useInitialisedZoomClient } from './hooks/useInitialisedZoomClient';
import { useRenderVideoOfHost } from './hooks/useRenderVideoOfHost';
import { videoDimensions } from './videoConfig';
import { ZoomCallTimeoutModal } from './ZoomCallTimeoutModal';
import { ZoomClient } from './zoomTypes';
import styles from './ZoomCallRemote.module.css';

export const ZoomCallRemote = () => {
    const zoomClient = useInitialisedZoomClient();

    if (zoomClient) {
        return <ZoomCallRemoteInitialised zoomClient={zoomClient} />;
    } else {
        return <ZoomCallRemoteUninitialised />;
    }
};

const ZoomCallRemoteUninitialised = () => {
    return (
        <>
        <canvas
            {...videoDimensions}
            className={styles.hostVideoCanvas}
            style={{ visibility: 'hidden' }}
        />
        <div>Disconnected</div>
        <div>
            <button disabled={true}>Loading...</button>
        </div>
        </>
    );
};

const ZoomCallRemoteInitialised = ({ zoomClient }: { zoomClient: ZoomClient }) => {
    const { quiz } = useQuizContext();
    const [shouldBeInCall, setShouldBeInCall] = useState(false);
    const videoCanvasRef = useRef<HTMLCanvasElement|null>(null);
    const videoHasStarted = useRenderVideoOfHost(shouldBeInCall && quiz.isZoomSessionLive, zoomClient, videoCanvasRef);
    const { showTimeoutModal, postponeTimeoutThirtyMinutes } = useDisconnectAfterTimeout(
        shouldBeInCall && quiz.isZoomSessionLive,
        zoomClient,
        () => setShouldBeInCall(false),
    );

    const disconnect = () => {
        zoomClient.leave();
        setShouldBeInCall(false);
    };

    const status = shouldBeInCall ?
        (quiz.isZoomSessionLive ?
            (videoHasStarted ?
                'Joined' :
                'Connecting'
            ) :
            'Waiting for host'
        ) :
        'Disconnected';
    return (
        <>
        <canvas
            ref={videoCanvasRef}
            {...videoDimensions}
            className={styles.hostVideoCanvas}
            style={{ visibility: videoHasStarted ? 'initial' : 'hidden' }}
        />
        <div>{status}</div>
        <div>
            {shouldBeInCall && <DangerButton onClick={() => setShouldBeInCall(false)}>Leave call</DangerButton>}
            {!shouldBeInCall && <PrimaryButton onClick={() => setShouldBeInCall(true)}>Join call</PrimaryButton>}
        </div>
        {showTimeoutModal && <ZoomCallTimeoutModal onStayConnected={postponeTimeoutThirtyMinutes} onDisconnect={disconnect} />}
        </>
    );
};