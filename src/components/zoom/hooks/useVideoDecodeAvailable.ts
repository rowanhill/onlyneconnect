import { MediaSDKEncDecPayload } from '@zoom/videosdk';
import { useEffect, useState } from 'react';
import { ZoomClient } from '../zoomTypes';

export const useVideoDecodeAvailable = (zoomClient: ZoomClient) => {
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