import { useRef, useLayoutEffect, useCallback, useState } from 'react';

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

/**
 * If running in Cypress, set a variable on window to communicate whether a scroll is happening or
 * whether it has settled.
 */
function setScrollForCypress(isScrolling: boolean) {
    if ((window as any).Cypress) {
        (window as any).__ONLYNE_CONNECT__IS_SCROLLING = isScrolling;
    }
}

function scrollIntoViewIfNeeded(target: HTMLElement | null, container: HTMLElement | null) {
    if (!target || !container) {
        // Without a target and/or container, we can't scroll, so bail out
        return;
    }
    if (!targetIsFullyVisible(target, container)) {
        setScrollForCypress(true);
        target.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
}

/**
 * Create a paired ref and state value. The ref and the setter will not change even if the value
 * changes.
 */
const useStateRef = <T>(initialValue: T): [T, (newVal: T) => void, React.MutableRefObject<T>] => {
    const [val, setValState] = useState(initialValue);
    const ref = useRef(initialValue);
    const setVal = useCallback((newVal: T) => {
        setValState(newVal);
        ref.current = newVal;
    }, []);
    return [val, setVal, ref];
};

export function useAutoscroll() {
    const containerRef = useRef<HTMLElement | null>(null);
    const targetRef = useRef<HTMLElement|null>(null);
    const [isAutoscrollEnabled, setAutoscrollEnabled, isAutoscrollEnabledRef] = useStateRef(true);
    const timeoutRef = useRef<number|undefined>();
    const lastLayoutTargetRef = useRef<HTMLElement|null>(null);

    // After layout, scroll if needed - i.e. if the render caused a new target to be obscured
    useLayoutEffect(() => {
        if (!isAutoscrollEnabled) {
            return;
        }
        const target = targetRef.current;
        const container = containerRef.current;
        if (lastLayoutTargetRef.current === target) {
            // If the target is unchanged, ignore this render. Without this check, we might
            // request multiple scrolls to the same element whilst the scroll animation occurs.
            return;
        }
        scrollIntoViewIfNeeded(target, container);
        lastLayoutTargetRef.current = target;
    });

    // When the container is scrolled, determine if autoscrolling should be enabled / disabled
    // Because the scroll even fires frequently, including when scrolling programatically, we debounce
    // the event, and only process it after a 'quiet' period of time where the event doesn't fire.
    const updateAutoscrollDebounced = useCallback(() => {
        const updateAutoscroll = () => {
            setScrollForCypress(false);
            const target = targetRef.current;
            const container = containerRef.current;
            if (!container) {
                return;
            }
            // If there is a target, we can infer the user's intent from whether or not it's visible after
            // scrolling as stopped. If there's not a target, we leave autoscroll as is.
            if (target) {
                const scrolledToTarget = targetIsFullyVisible(target, container);
                // We use a ref to whether autoscroll is enabled rather than the state var so that
                // updateAutoscrollDebounced doesn't depend on the state and get recreated each time the
                // state changes.
                if (isAutoscrollEnabledRef.current !== scrolledToTarget) {
                    setAutoscrollEnabled(scrolledToTarget);
                }
            }
        };

        setScrollForCypress(true);
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(updateAutoscroll, 200) as unknown as number;
    }, [isAutoscrollEnabledRef, setAutoscrollEnabled]); // isAutoscrollEnabledRef and setAutoscrollEnabled never change

    // When the container ref changes, attatch a scroll listener (and detatch any old ones). Note that when the component
    // unmounts, the container ref will be set to null.
    const setContainerRef = useCallback((element: HTMLElement|null) => {
        if (containerRef.current) {
            containerRef.current.removeEventListener('scroll', updateAutoscrollDebounced);
        }

        containerRef.current = element;

        if (containerRef.current) {
            containerRef.current.addEventListener('scroll', updateAutoscrollDebounced, { passive: true });
        }
    }, [updateAutoscrollDebounced]);

    const toggleAutoscroll = useCallback(() => {
        const newVal = !isAutoscrollEnabledRef.current;
        if (newVal) {
            scrollIntoViewIfNeeded(targetRef.current, containerRef.current);
        }
        setAutoscrollEnabled(newVal);
    }, [isAutoscrollEnabledRef, setAutoscrollEnabled]); // isAutoscrollEnabledRef and setAutoscrollEnabled never change

    return { setContainerRef, targetRef, toggleAutoscroll, isAutoscrollEnabled };
}