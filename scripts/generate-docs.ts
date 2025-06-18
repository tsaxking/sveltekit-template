import { fileTree, type FileTree } from '../src/lib/server/utils/files';


export default async () => {
    const tree = await fileTree(process.cwd()).unwrap();

    const createFile = (tree: FileTree) => {}
}