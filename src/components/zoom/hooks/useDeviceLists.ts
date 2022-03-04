import { useEffect, useRef, useState } from 'react';

export const useDeviceLists = () => {
    const [selectedCamera, setSelectedCamera] = useState<MediaDeviceInfo|null>(null);
    const [cameraList, setCameraList] = useState<MediaDeviceInfo[]|null>(null);
    const cameraInitialised = useRef(false);

    const [selectedMic, setSelectedMic] = useState<MediaDeviceInfo|null>(null);
    const [micList, setMicList] = useState<MediaDeviceInfo[]|null>(null);
    const micInitialised = useRef(false);

    const [selectedSpeaker, setSelectedSpeaker] = useState<MediaDeviceInfo|null>(null);
    const [speakerList, setSpeakerList] = useState<MediaDeviceInfo[]|null>(null);
    const speakerInitialised = useRef(false);

    useEffect(() => {
        const init = async () => {
            const devices = await navigator.mediaDevices.enumerateDevices();

            const cameras = devices.filter((d) => d.kind === 'videoinput');
            const mics = devices.filter((d) => d.kind === 'audioinput');
            const speakers = devices.filter((d) => d.kind === 'audiooutput');

            setCameraList(cameras);
            if (cameraInitialised.current === false && cameras.length > 0) {
                setSelectedCamera(cameras[0]);
                cameraInitialised.current = true;
            }

            setMicList(mics);
            if (micInitialised.current ===false && mics.length > 0) {
                setSelectedMic(mics[0]);
                micInitialised.current = true;
            }

            setSpeakerList(speakers);
            if (speakerInitialised.current === false && speakers.length > 0) {
                setSelectedSpeaker(speakers[0]);
                speakerInitialised.current = true;
            }
        };
        init();

        navigator.mediaDevices.addEventListener('devicechange', init);

        return () => navigator.mediaDevices.removeEventListener('devicechange', init);
    }, []);

    return {
        cameras: {
            selected: selectedCamera,
            setSelected: setSelectedCamera,
            list: cameraList,
        },
        mics: {
            selected: selectedMic,
            setSelected: setSelectedMic,
            list: micList,
        },
        speakers: {
            selected: selectedSpeaker,
            setSelected: setSelectedSpeaker,
            list: speakerList,
        },
    };
};