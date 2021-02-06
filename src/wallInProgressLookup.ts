import { CollectionQueryItem, CollectionQueryResult } from './hooks/useCollectionResult';
import { WallInProgress } from './models';

export function createWipLookup(queryResult: CollectionQueryResult<WallInProgress> | undefined) {
    if (!queryResult || !queryResult.data) {
        return undefined;
    }

    const wipItems = queryResult.data;

    const wallInProgressByTeamIdByClueId = wipItems.reduce((acc, wip) => {
        const clueId = wip.data.clueId;
        const teamId = wip.data.teamId;
        if (!acc[clueId]) {
            acc[clueId] = {};
        }
        if (!acc[clueId][teamId]) {
            acc[clueId][teamId] = wip;
        }
        return acc;
    }, {} as { [clueId: string]: { [teamId: string]: CollectionQueryItem<WallInProgress> }});

    return wallInProgressByTeamIdByClueId;
}