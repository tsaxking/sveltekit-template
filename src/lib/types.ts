export enum PropertyAction {
    Read = 'read',
    Update = 'update'
}

// these are not property specific
export enum DataAction {
    Create = 'create',
    Delete = 'delete',
    Archive = 'archive',
    RestoreArchive = 'restore-archive',
    RestoreVersion = 'restore-version',
    DeleteVersion = 'delete-version',
    ReadVersionHistory = 'read-version-history',
    ReadArchive = 'read-archive'
}

export type SocketEvents = {
    test: void;
};