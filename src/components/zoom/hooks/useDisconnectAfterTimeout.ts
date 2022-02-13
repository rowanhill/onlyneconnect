import { useCallback, useEffect, useRef, useState } from 'react';
import { ZoomClient } from '../zoomTypes';

const twoHoursMs =  2 * 60 * 60 * 1000;
const thirtyMinutesMs = 30 * 60 * 1000;
const thirtySecondsMs = 30 * 1000;

export const useDisconnectAfterTimeout = (sessionIsLive: boolean, zoomClient: ZoomClient, onDisconnect: () => void) => {
    const [showTimeoutModal, setShowTimeoutModal] = useState(false);
    
    // Keep a ref to latest zoom client; expected to only be one
    const zoomClientRef = useRef(zoomClient);
    useEffect(() => {
        zoomClientRef.current = zoomClient;
    }, [zoomClient]);

    // Keep a ref to latest onDisconnect; may update with each render
    const onDisconnectRef = useRef(onDisconnect);
    useEffect(() => {
        onDisconnectRef.current = onDisconnect;
    }, [onDisconnect]);

    // Keep a ref to current timer handles
    const timersRef = useRef<{ modal: number; disconnect: number; }>();

    const resetTimeoutModalTimer = useCallback((time: number) => {
        function disconnect() {
            const isHost = zoomClientRef.current.getCurrentUserInfo().isHost;
            onDisconnectRef.current();
            zoomClientRef.current.leave(isHost);
        }

        // If there are existing timers, clear them
        if (timersRef.current) {
            clearTimeout(timersRef.current.modal);
            clearTimeout(timersRef.current.disconnect);
        }

        // Set new timers
        const modalTimer = window.setTimeout(() => setShowTimeoutModal(true), time);
        const disconnectTimer = window.setTimeout(() => disconnect, time + thirtySecondsMs);

        // Update the current timers ref, to allow them to be cleared in future
        timersRef.current = {
            modal: modalTimer,
            disconnect: disconnectTimer,
        };
    }, []);

    // When the session becomes live, start the timers; clear them if it stops being live / on unmount
    useEffect(() => {
        if (!sessionIsLive) {
            return;
        }
        resetTimeoutModalTimer(twoHoursMs);
        return () => {
            if (timersRef.current) {
                clearTimeout(timersRef.current.modal);
                clearTimeout(timersRef.current.disconnect);
            }
        };
    }, [sessionIsLive, resetTimeoutModalTimer]);

    const postponeTimeoutThirtyMinutes = () => {
        resetTimeoutModalTimer(thirtyMinutesMs);
    };

    return { showTimeoutModal, postponeTimeoutThirtyMinutes };
};
