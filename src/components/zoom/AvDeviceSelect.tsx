import { ChangeEvent } from 'react';
import { DeviceList } from './hooks/useDeviceLists';

type SelectProps = React.DetailedHTMLProps<React.HTMLAttributes<HTMLSelectElement>, HTMLSelectElement>;

export const AvDeviceSelect = (props: SelectProps & { deviceList: DeviceList; }) => {
    const { deviceList, ...selectProps } = props;
    const handleDeviceChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const device = deviceList.list?.find((d) => d.deviceId === e.target.value);
        if (device) {
            deviceList.setSelected(device);
        }
    };
    return (
        <select value={deviceList.selected?.deviceId} onChange={handleDeviceChange} {...selectProps}>
            {deviceList.list === null && <option>Loading...</option>}
            {deviceList.list && deviceList.list.map((device) =>
                <option key={device.deviceId} value={device.deviceId}>{device.label}</option>)
            }
        </select>
    );
};