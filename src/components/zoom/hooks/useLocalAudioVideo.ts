import { RefObject, useEffect, useState } from 'react';
import ZoomVideo, { LocalAudioTrack, LocalVideoTrack } from '@zoom/videosdk';

export const useLocalAudioVideo = (showLocal: boolean, videoRef: RefObject<HTMLVideoElement|undefined>) => {
    const [localVideoTrack, setLocalVideoTrack] = useState<LocalVideoTrack>();
    const [localAudioTrack, setLocalAudioTrack] = useState<LocalAudioTrack>();
    useEffect(() => {
        let vidTrack: LocalVideoTrack;
        let audTrack: LocalAudioTrack;
        async function start() {
            if (!videoRef.current) {
                return;
            }
            vidTrack = ZoomVideo.createLocalVideoTrack();
            audTrack = ZoomVideo.createLocalAudioTrack();
            await Promise.all([
                vidTrack.start(videoRef.current),
                audTrack.start()
            ]);
            setLocalVideoTrack(vidTrack);
            setLocalAudioTrack(audTrack);
        }
        if (showLocal) {
            start();
        }
        return () => {
            vidTrack?.stop();
            audTrack?.stop();
        }
    }, [showLocal, videoRef]);

    return { localVideoTrack, localAudioTrack };
};