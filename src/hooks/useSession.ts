import { useContext } from 'react';
import { UserContext } from '../contexts/user';

export const useSession = () => {
    const { user } = useContext(UserContext);
    return user;
};