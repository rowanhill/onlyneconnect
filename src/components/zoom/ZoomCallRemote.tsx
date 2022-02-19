import { ComponentProps, RefObject, useRef, useState } from 'react';
import { DangerButton } from '../../Button';
import { useQuizContext } from '../../contexts/quizPage';
import { useDisconnectAfterTimeout } from './hooks/useDisconnectAfterTimeout';
import { useInitialisedZoomClient } from './hooks/useInitialisedZoomClient';
import { useRenderVideoOfHost } from './hooks/useRenderVideoOfHost';
import { videoDimensions } from './videoConfig';
import { ZoomCallTimeoutModal } from './ZoomCallTimeoutModal';
import { ZoomClient } from './zoomTypes';
import styles from './ZoomCallRemote.module.css';
import { ReactComponent as PlayIcon } from './play.svg';

export const ZoomCallRemote = () => {
    const zoomClient = useInitialisedZoomClient();

    if (zoomClient) {
        return <ZoomCallRemoteInitialised zoomClient={zoomClient} />;
    } else {
        return <ZoomCallRemotePresentation state="zoom-loading" />;
    }
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

    const joinCall = () => {
        setShouldBeInCall(true);
    };
    const leaveCall = () => {
        setShouldBeInCall(false);
    };
    const disconnect = () => {
        zoomClient.leave();
        leaveCall();
    };

    let state: ComponentProps<typeof ZoomCallRemotePresentation>['state'];
    if (shouldBeInCall) {
        if (videoHasStarted) {
            state = 'joined';
        } else {
            if (quiz.isZoomSessionLive) {
                state = 'connecting';
            } else {
                state = 'lobby';
            }
        }
    } else {
        state = 'disconnected';
    }

    return (
        <>
        <ZoomCallRemotePresentation state={state} videoCanvasRef={videoCanvasRef} joinCall={joinCall} leaveCall={leaveCall} />
        {showTimeoutModal && <ZoomCallTimeoutModal onStayConnected={postponeTimeoutThirtyMinutes} onDisconnect={disconnect} />}
        </>
    );
};

const ZoomCallRemotePresentation = (props: {
    state: 'zoom-loading' | 'disconnected' | 'connecting' | 'lobby' | 'joined';
    videoCanvasRef?: RefObject<HTMLCanvasElement>;
    leaveCall?: () => void;
    joinCall?: () => void;
}) => {
    return (
        <div className={styles.playerWrapper}>
            <div className={styles.videoWrapper}>
                <canvas
                    ref={props.videoCanvasRef}
                    {...videoDimensions}
                    className={styles.hostVideoCanvas}
                    style={{ visibility: props.state === 'joined' ? 'initial' : 'hidden' }}
                />
                {(props.state === 'connecting' || props.state === 'lobby') &&
                    <div className={styles.videoCover}>
                        {props.state === 'connecting' ? 'Connecting' : 'Waiting for host'}
                    </div>
                }
            </div>
            <div className={styles.toolbar}>
                <DangerButton
                    style={{ visibility: (props.state === 'joined' || props.state === 'lobby') ? 'initial' : 'hidden'}}
                    onClick={props.leaveCall}
                >Leave call</DangerButton>
            </div>
            {(props.state === 'zoom-loading' || props.state === 'disconnected') &&
                <div className={styles.playerCover}>
                    {props.state === 'zoom-loading' && <>Loading...</>}
                    {props.state ==='disconnected' && <PlayIcon className={styles.playSvg} onClick={props.joinCall} />}
                </div>
            }
        </div>
    );
};