import React from 'react';

export class GenericErrorBoundary extends React.Component<{}, { hasError: boolean; }> {
    constructor(props: {}) {
        super(props);
        this.state = { hasError: false };
    }
  
    static getDerivedStateFromError() {
        return { hasError: true };
    }
  
    render() {
        if (this.state.hasError) {
            return <p>Something went wrong.</p>;
        }
        return this.props.children; 
    }
}