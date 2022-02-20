import { useQuizContext } from '../../../contexts/quizPage';
import { ZoomClient } from '../zoomTypes';
import { RefObject, useCallback, useEffect, useRef } from 'react';
import { joinZoomSession } from '../zoomSession';
import { updateZoomSessionStatus } from '../../../models/quiz';

export const useHostBroadcast = (zoomClient: ZoomClient, videoRef: RefObject<HTMLVideoElement|null|undefined>) => {
    const { quiz, quizId } = useQuizContext();

    // Keep a ref to what zoom id is recorded in the DB, for use by callbacks
    const ownerZoomIdInDbRef = useRef(quiz.ownerZoomId);
    useEffect(() => {
        ownerZoomIdInDbRef.current = quiz.ownerZoomId;
    }, [quiz]);

    async function joinCall(didStartSession: { flag: boolean; }) {
        // Join the call - first user to join becomes host
        const stream = await joinZoomSession(zoomClient, quizId, quiz, id => `Quiz Host: ${id}`);
        didStartSession.flag = true;
    
        // Start the audio & video
        await Promise.all([stream.startAudio(), stream.startVideo({ videoElement: videoRef.current! })]);
        stream.unmuteAudio();

        // Async mark the quiz's zoom session as being live
        updateZoomSessionStatus(quizId, zoomClient.getCurrentUserInfo().userId);
    }

    const endCall = useCallback(async () => {
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

    return { joinCall, endCall };
};