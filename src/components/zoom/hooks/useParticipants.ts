import { Participant } from '@zoom/videosdk';
import { useCallback, useEffect, useState } from 'react';
import { ZoomClient } from '../zoomTypes';

export const useParticipants = (zoomClient: ZoomClient) => {
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