import { useRef, useEffect, useState } from 'react'

function animationInterval(ms: number, signal: AbortSignal, callback: (time: number) => void) {
    // Prefer currentTime, as it'll better sync animtions queued in the 
    // same frame, but if it isn't supported, performance.now() is fine.
    const start = document.timeline?.currentTime || performance.now();
  
    function frame(time: number) {
        if (signal.aborted) return;
        callback(time);
        scheduleFrame(time);
    }
  
    function scheduleFrame(time: number) {
        const elapsed = time - start;
        const roundedElapsed = Math.round(elapsed / ms) * ms;
        const targetNext = start + roundedElapsed + ms;
        const delay = targetNext - performance.now();
        setTimeout(() => requestAnimationFrame(frame), delay);
    }
  
    scheduleFrame(start);
  }

export const useAnimationFrame = (ms: number, callback: (time: number) => void) => {
    const callbackRef = useRef(callback);
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);
  
    useEffect(() => {
        const controller = new AbortController();
        animationInterval(ms, controller.signal, callbackRef.current);
        return () => controller.abort();
    }, [ms]);
};

export const useAnimationTimer = (ms: number) => {
    const [time, setTime] = useState(0);
    useAnimationFrame(ms, (newTime) => setTime(newTime));
    return time;
}