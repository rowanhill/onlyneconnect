import { Card } from '../../Card';
import { GenericErrorBoundary } from '../../GenericErrorBoundary';
import { ZoomCallLocal } from './ZoomCallLocal';
import { ZoomCallRemote } from './ZoomCallRemote';

export const ZoomCard = (props: { isQuizOwner: boolean; }) => {
    return (
        <Card>
            <GenericErrorBoundary>
                {props.isQuizOwner ?
                    <ZoomCallLocal /> :
                    <ZoomCallRemote />
                }
            </GenericErrorBoundary>
        </Card>
    );
}