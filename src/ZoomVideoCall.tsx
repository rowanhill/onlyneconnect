import ZoomVideo, { Stream, Participant, VideoClient, VideoQuality } from '@zoom/videosdk';
import { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { Card } from './Card';
import { useQuizContext } from './contexts/quizPage';
import firebase from './firebase';
import './firebase-functions';
import { GenericErrorBoundary } from './GenericErrorBoundary';

type MediaStream = typeof Stream;
type ZoomClient = typeof VideoClient;

// This interface is declared in the Zoom SDK but not exposed
interface MediaSDKEncDecPayload {
    action: 'encode' | 'decode';
    type: 'audio' | 'video' | 'share';
    result: 'success' | 'fail';
}

const useInitialisedZoomClient = () => {
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

const useVideoDecodeAvailable = (zoomClient: ZoomClient) => {
    const [videoDecodeAvailable, setVideoDecodeAvailable] = useState(false);
    const onMediaSdkChange = ({ action, type, result }: MediaSDKEncDecPayload) => {
        if (type === 'video' && action === 'decode') {
            setVideoDecodeAvailable(result === 'success');
        }
    };
    useEffect(() => {
        zoomClient.on('media-sdk-change', onMediaSdkChange);
        return () => {
            zoomClient.off('media-sdk-change', onMediaSdkChange);
        };
    }, [zoomClient]);
    return videoDecodeAvailable;
};

const useParticipants = (zoomClient: ZoomClient) => {
    const [participants, setParticipants] = useState<Participant[]>([]);

    const refreshParticipants = useCallback(() => {
        setParticipants(zoomClient.getAllUser());
    }, [zoomClient]);

    // On mount only, get initial list of participants
    useEffect(refreshParticipants, [refreshParticipants]);

    // Subsequently, keep track of participant changes
    useEffect(() => {
        zoomClient.on('user-added', refreshParticipants);
        zoomClient.on('user-removed', refreshParticipants);
        zoomClient.on('user-updated', refreshParticipants);
        return () => {
            zoomClient.off('user-added', refreshParticipants);
            zoomClient.off('user-removed', refreshParticipants);
            zoomClient.off('user-updated', refreshParticipants);
        };
    }, [zoomClient, refreshParticipants]);

    return participants;
};

const useHostParticipant = (zoomClient: ZoomClient) => {
    const participants = useParticipants(zoomClient);
    return participants.find(p => p.isHost === true);
}

const useRenderVideo = (
    mediaStream: MediaStream|undefined,
    videoCanvasRef: RefObject<HTMLCanvasElement|undefined>,
    isVideoDecodeAvailable: boolean,
    participant: Participant|undefined,
) => {
    useEffect(() => {
        let videoIsRendering = false;

        // Start the video if possible
        if (mediaStream && videoCanvasRef.current && isVideoDecodeAvailable && participant && participant.bVideoOn) {
            mediaStream.renderVideo(
                videoCanvasRef.current,
                participant.userId,
                360,
                270,
                0,
                0,
                VideoQuality.Video_360P,
            );
            videoIsRendering = true;
        }

        // If the dependencies change, stop the video if necessary
        const capturedCanvasRef = videoCanvasRef.current;
        return () => {
            // videoIsRendering === true should imply the other variables are not falsy, but we check them to make typescript happy
            if (videoIsRendering === true && mediaStream && capturedCanvasRef && participant) {
                mediaStream.stopRenderVideo(capturedCanvasRef, participant.userId)
            }
        };
    }, [mediaStream, videoCanvasRef, isVideoDecodeAvailable, participant]);
};

export const ZoomVideoCall = (props: { isQuizOwner: boolean; }) => {
    return (
        <Card>
            <GenericErrorBoundary>
                <ZoomVideoCallContent {...props} />
            </GenericErrorBoundary>
        </Card>
    );
}

const ZoomVideoCallContent = (props: { isQuizOwner: boolean; }) => {
    const zoomClient = useInitialisedZoomClient();

    if (zoomClient) {
        return <ZoomVideoCallInitialized zoomClient={zoomClient} {...props} />;
    } else {
        return (
            <div>
                <canvas width={360} height={270}></canvas>
                <div>
                    <button disabled={true}>Loading...</button>
                </div>
            </div>
        );
    }
};

type VideoState = 'off' | 'previewing' | 'connecting' | 'on';
const ZoomVideoCallInitialized = ({ zoomClient, isQuizOwner }: { zoomClient: ZoomClient; isQuizOwner: boolean; }) => {
    const { quizId, quiz } = useQuizContext();
    const [videoState, setVideoState] = useState<VideoState>('off');
    const [mediaStream, setMediaStream] = useState<MediaStream>();
    const videoCanvasRef = useRef<HTMLCanvasElement|null>();
    const isVideoDecodeAvailable = useVideoDecodeAvailable(zoomClient);
    const host = useHostParticipant(zoomClient);

    useRenderVideo(mediaStream, videoCanvasRef, isVideoDecodeAvailable, host)

    const startPreview = () => {
        setVideoState('previewing');
    };
    const startBroadcast = () => {
        // Set videoState to connecting while joining is in progress
        setVideoState('connecting');

        async function joinCall() {
            let didStartSession = false;

            try {
                // Generate the signature of a JWT server-side
                const generateZoomToken = firebase.functions().httpsCallable('generateZoomToken');
                const tokenResult = await generateZoomToken({ quizId, topic: quiz.name });
                const token = tokenResult.data;
                
                // Join the call - first user to join becomes host
                const currentUser = firebase.auth().currentUser;
                const name = currentUser?.displayName || currentUser?.email || (isQuizOwner ? 'Quiz Host' : `Player ${currentUser?.uid}`);
                await zoomClient.join(quiz.name, token, name);
                didStartSession = true;
            
                // One joining is complete, set the media stream for later user
                const stream = zoomClient.getMediaStream();
                setMediaStream(stream);

                // Start audio / video as appropriate.
                // All participants join audio, but only the quiz owner uses the microphone.
                // Only the quiz owner joins with video (but everyone renders video).
                const promises = [];
                promises.push(stream.startAudio({ speakerOnly: !isQuizOwner }));
                if (isQuizOwner) {
                    promises.push(stream.startVideo());
                }
                await Promise.all(promises);

                // Mirror the video if we're the host
                if (isQuizOwner) {
                    stream.mirrorVideo(true);
                }
            } finally {
                // Set video state to reflect joining process being complete
                setVideoState(didStartSession ? 'on' : 'off');
            }
        }
        joinCall();
    };
    const stopBroadcast = () => {
        // Leave the call. If the user is the quiz owner (and thus the call host), end the call for everyone
        if (mediaStream && videoCanvasRef.current) {
            mediaStream.clearVideoCanvas(videoCanvasRef.current);
        }
        zoomClient.leave(isQuizOwner);
        setVideoState('off');
    };

    return (
        <div>
            <canvas
                ref={el => videoCanvasRef.current = el}
                width={360}
                height={270}
                style={{
                    visibility: videoState === 'off' ? 'hidden' : 'initial'
                }}
            ></canvas>
            <div>
                {videoState === 'off' && <button onClick={startPreview}>Preview video</button>}
                {videoState === 'previewing' && <button onClick={startBroadcast}>Start broadcast</button>}
                {videoState === 'connecting' && <button disabled={true}>Connecting...</button>}
                {videoState === 'on' && <button onClick={stopBroadcast}>Stop broadcast</button>}
            </div>
        </div>
    );
};