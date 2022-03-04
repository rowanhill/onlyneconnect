import { useQuizContext } from '../../../contexts/quizPage';
import { MediaStream, ZoomClient } from '../zoomTypes';
import { useCallback, useEffect, useRef, useState } from 'react';
import { joinZoomSession } from '../zoomSession';
import { updateZoomSessionStatus } from '../../../models/quiz';

export const useHostBroadcast = (
    zoomClient: ZoomClient,
    cameraId: string | undefined,
    micId: string | undefined,
    speakerId: string | undefined,
) => {
    const { quiz, quizId } = useQuizContext();
    const [mediaStream, setMediaStream] = useState<MediaStream>();

    // Keep a ref to what zoom id is recorded in the DB, for use by callbacks
    const ownerZoomIdInDbRef = useRef(quiz.ownerZoomId);
    useEffect(() => {
        ownerZoomIdInDbRef.current = quiz.ownerZoomId;
    }, [quiz]);

    // Switch the camera / mic / speaker on change once the media stream is live
    useEffect(() => {
        if (!mediaStream) {
            return;
        }
        if (speakerId) {
            mediaStream.switchSpeaker(speakerId);
        }
        if (micId) {
            mediaStream.switchMicrophone(micId);
        }
        if (cameraId) {
            mediaStream.switchCamera(cameraId);
        }
    }, [mediaStream, speakerId, micId, cameraId]);

    async function joinCall(didStartSession: { flag: boolean; }) {
        // Join the call - first user to join becomes host
        const stream = await joinZoomSession(zoomClient, quizId, quiz, id => `Quiz Host: ${id}`);
        didStartSession.flag = true;
    
        // Start the audio & video
        await Promise.all([stream.startAudio(), stream.startVideo({ cameraId })]);
        if (speakerId) {
            stream.switchSpeaker(speakerId);
        }
        if (micId) {
            stream.switchMicrophone(micId);
        }
        stream.unmuteAudio();
        setMediaStream(stream);

        // Async mark the quiz's zoom session as being live
        updateZoomSessionStatus(quizId, zoomClient.getCurrentUserInfo().userId);
    }

    const endCall = useCallback(async () => {
        setMediaStream(undefined);

        // Mark the quiz's zoom session as being closed and wait for confirmation before proceeding
        // By waiting we reduce the window in which a player can request a zoom token and accidentally
        // become host.
        if (ownerZoomIdInDbRef.current !== null) {
            await updateZoomSessionStatus(quizId, null);
        }

        // Leave the call (and end it for all other participants)
        if (zoomClient.getSessionInfo().isInMeeting) {
            zoomClient.leave(true);
        }
    }, [zoomClient, quizId]);


    // End the call on unmount
    useEffect(() => {
        return () => {
            endCall();
        };
    }, [endCall]);

    return { joinCall, endCall, mediaStream };
};