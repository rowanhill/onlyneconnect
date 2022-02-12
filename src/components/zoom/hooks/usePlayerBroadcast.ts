import { useQuizContext } from '../../../contexts/quizPage';
import { MediaStream, ZoomClient } from '../zoomTypes';
import { joinZoomSession } from '../zoomSession';
import { useEffect, useState } from 'react';

export const usePlayerBroadcast = (joinCall: boolean, zoomClient: ZoomClient) => {
    const { quiz, quizId } = useQuizContext();
    const [mediaStream, setMediaStream] = useState<MediaStream>();

    useEffect(() => {
        async function joinSessionAndAudio() {
            // Start playing the audio (without starting the mic)
            const stream = await joinZoomSession(zoomClient, quizId, quiz, (id) => `Player: ${id}`);
            await stream.startAudio({ speakerOnly: true });
            setMediaStream(stream);
        }

        if (joinCall) {
            joinSessionAndAudio();
        }

        return () => {
            // Leave the call (if in it)
            if (zoomClient.getSessionInfo().isInMeeting) {
                zoomClient.leave();
            }
            setMediaStream(undefined);
        };
    }, [quiz, quizId, zoomClient, joinCall]);

    return mediaStream;
};