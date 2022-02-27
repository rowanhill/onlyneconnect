import { VideoQuality } from '@zoom/videosdk';
import { RefObject, useEffect } from 'react';
import { MediaStream, ZoomClient } from '../zoomTypes';
import { useParticipants } from './useParticipants';
import { useVideoDecodeAvailable } from './useVideoDecodeAvailable';

export const useRenderVideoOfHost = (
    mediaStream: MediaStream|undefined,
    zoomClient: ZoomClient,
    videoCanvasRef: RefObject<HTMLCanvasElement|undefined>,
) => {
    const isVideoDecodeAvailable = useVideoDecodeAvailable(zoomClient);
    const participants = useParticipants(zoomClient);
    const participant = participants.find(p => p.isHost === true);

    useEffect(() => {
        let videoIsRendering = false;

        // Start the video if possible
        if (mediaStream && videoCanvasRef.current && isVideoDecodeAvailable && participant && participant.bVideoOn) {
            mediaStream.renderVideo(
                videoCanvasRef.current,
                participant.userId,
                640,
                360,
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
                    .catch((err) => {
                        console.error('Could not stop rendering video', err);
                    });
            }
        };
    }, [mediaStream, videoCanvasRef, isVideoDecodeAvailable, participant]);

    return !!mediaStream;
};