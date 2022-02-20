import { ParticipantPropertiesPayload } from '@zoom/videosdk';
import { useEffect, useRef } from 'react';
import { Quiz } from '../../../models';
import { ZoomClient } from '../zoomTypes';

export const useRelinquishHostToOwner = (zoomClient: ZoomClient, quiz: Quiz) => {
    const ownerZoomIdRef = useRef(quiz.ownerZoomId);
    useEffect(() => {
        ownerZoomIdRef.current = quiz.ownerZoomId;
    }, [quiz]);

    useEffect(() => {
        const handleUserAdded = (payload: ParticipantPropertiesPayload[]) => {
            if (!zoomClient.isHost()) {
                // If the current user isn't the host, can't relinquish hosting to the owner, so we're done
                return;
            }

            // If an added user is the owner, make them the host
            for (const user of payload) {
                if (user.userId === ownerZoomIdRef.current) {
                    zoomClient.makeHost(ownerZoomIdRef.current);
                    break;
                }
            }
        };

        zoomClient.on('user-added', handleUserAdded);
        return () => zoomClient.off('user-added', handleUserAdded);
    }, [zoomClient]);
};