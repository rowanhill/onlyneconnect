import { useRef, useState } from 'react';
import { useQuizContext } from '../../contexts/quizPage';
import { useInitialisedZoomClient } from './hooks/useInitialisedZoomClient';
import { useRenderVideoOfHost } from './hooks/useRenderVideoOfHost';
import { videoDimensions } from './videoConfig';
import { ZoomClient } from './zoomTypes';

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
            style={{
                visibility: 'hidden',
                width: '100%',
                height: 'auto',
            }}
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
            style={{
                visibility: videoHasStarted ? 'initial' : 'hidden',
                width: '100%',
                height: 'auto',
            }}
        />
        <div>{status}</div>
        <div>
            {shouldBeInCall && <button onClick={() => setShouldBeInCall(false)}>Leave call</button>}
            {!shouldBeInCall && <button onClick={() => setShouldBeInCall(true)}>Join call</button>}
        </div>
        </>
    );
};