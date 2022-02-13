import { DangerButton, PrimaryButton } from '../../Button'
import { Modal } from '../Modal';

export const ZoomCallTimeoutModal = ({ onStayConnected, onDisconnect }: { onStayConnected: () => void; onDisconnect: () => void; }) => {
    return (
        <Modal>
            <p>The quiz call has been running for a long time. It will automatically disconnect in 30 seconds.</p>
            <p>Would you like to continue?</p>
            <div>
                <PrimaryButton onClick={onStayConnected}>Stay connected</PrimaryButton>
                <DangerButton onClick={onDisconnect}>Disconnect</DangerButton>
            </div>
        </Modal>
    );
};