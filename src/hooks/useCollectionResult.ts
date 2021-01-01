import { useCollection } from 'react-firebase-hooks/firestore';
import firebase from '../firebase';

export interface CollectionQueryItem<T> {
    id: string;
    data: T;
}

export type CollectionQueryData<T> = CollectionQueryItem<T>[];

export interface CollectionQueryResult<T> {
    loading: boolean;
    error: Error | undefined;
    data: CollectionQueryData<T> | undefined;
}

export function useCollectionResult<T>(query: firebase.firestore.Query|null): CollectionQueryResult<T> {
    const [snapshot, loading, error] = useCollection(query) as [firebase.firestore.QuerySnapshot<T>|null, boolean, Error|undefined];
    const data = snapshot ?
        snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() })) :
        undefined;
    return { data, loading: loading || query === null, error };
}