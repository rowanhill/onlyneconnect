import { useRef, useLayoutEffect, useCallback, useEffect } from 'react';

function targetIsFullyVisible(target: HTMLElement, container: HTMLElement): boolean {
    // The container and the target (are assumed to) have the same offsetParent (<body>), so we make the bounds relative
    // to the container's content (i.e. not just the visible portion)
    const targetBounds = {
        top: target.offsetTop - container.offsetTop, // Target's top within the container
        bottom: target.offsetTop - container.offsetTop + target.clientHeight, // Target's bottom = top + height
    };
    const visibleBounds = {
        top: container.scrollTop, // Visible area starts at container's scrollTop
        bottom: container.scrollTop + container.clientHeight, // Visible area's bottom is top + height
    };

    return targetBounds.top >= visibleBounds.top && targetBounds.bottom <= visibleBounds.bottom;
}

export function useAutoscroll() {
    const containerRef = useRef<HTMLElement|null>(null);
    const targetRef = useRef<HTMLElement|null>(null);
    const autoscrollEnabledRef = useRef(true);

    // After layout, scroll if needed
    useLayoutEffect(() => {
        if (!autoscrollEnabledRef.current) {
            return;
        }
        const target = targetRef.current;
        const container = containerRef.current;
        if (!target || !container) {
            return;
        }
        if (!targetIsFullyVisible(target, container)) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });

    // When the container is scrolled, determine if autoscrolling should be enabled / disabled
    const updateAutoscroll = useCallback(() => {
        const target = targetRef.current;
        const container = containerRef.current;
        if (!container) {
            return;
        }
        autoscrollEnabledRef.current = target !== null && targetIsFullyVisible(target, container);
    }, []);

    // When the container ref changes, attatch a scroll listener (and detatch any old ones)
    const setContainerRef = useCallback((element: HTMLElement|null) => {
        if (containerRef.current) {
            containerRef.current.removeEventListener('scroll', updateAutoscroll);
        }

        containerRef.current = element;

        if (containerRef.current) {
            containerRef.current.addEventListener('scroll', updateAutoscroll, { passive: true });
        }
    }, [updateAutoscroll]);

    // When the component unmounts, detatch any scroll listener
    useEffect(() => {
        // No "on mount" effect, only a clean-up (i.e. "on unmount") action
        return () => {
            if (containerRef.current) {
                containerRef.current.removeEventListener('scroll', updateAutoscroll);
            }
        };
    }, [updateAutoscroll]);

    return { setContainerRef, targetRef };
}