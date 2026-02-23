/**
 * Folding Range Provider
 * Provides enhanced code folding for CMake files
 */

import * as vscode from 'vscode';
import {
    findMultiLineCommands as findMultiLineCommandsImpl,
    findCommentBlocks as findCommentBlocksImpl,
    findBlockPairs as findBlockPairsImpl,
    FoldingRangeInfo
} from '../utils/foldingUtils';

export class CMakeFoldingRangeProvider implements vscode.FoldingRangeProvider {
    
    provideFoldingRanges(
        document: vscode.TextDocument,
        context: vscode.FoldingContext,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.FoldingRange[]> {
        const text = document.getText();
        const lines = text.split('\n');
        
        const multiLine = findMultiLineCommandsImpl(lines);
        const comments = findCommentBlocksImpl(lines);
        const blocks = findBlockPairsImpl(lines, multiLine);
        
        const allInfos = [...multiLine, ...comments, ...blocks];
        
        return allInfos.map(info => new vscode.FoldingRange(
            info.start,
            info.end,
            info.kind === 'comment' ? vscode.FoldingRangeKind.Comment : vscode.FoldingRangeKind.Region
        ));
    }
}
