import Fuse from "fuse.js";
import { FileExplorerView } from "obsidian";
import { getFn, getItems, highlight } from "./utils";

export function clearFileExplorerFilter(fileExplorer: FileExplorerView) {
  let fileExplorerFilterEl: HTMLInputElement | null = document.body.querySelector(
    '.workspace-leaf-content[data-type="file-explorer"] .search-input-container > input'
  );
  fileExplorerFilterEl && (fileExplorerFilterEl.value = "");
  fileExplorer.tree.infinityScroll.filter = "";
  fileExplorer.tree.infinityScroll.compute();
}

export const fileExplorerFilter = function (fileExplorer: FileExplorerView, requireApiVersion: any) {
    const supportsVirtualChildren = requireApiVersion && requireApiVersion("0.15.0");

  if (!fileExplorer) return;
  const _children = supportsVirtualChildren ? this.rootEl?.vChildren._children : this.rootEl?.children;
  if (!_children) return;
  if (this.filter?.length >= 1) {
    if (!this.filtered) {
      this.rootEl._children = _children;
      this.filtered = true;
    }
    const options = {
      includeScore: true,
      includeMatches: true,
      useExtendedSearch: true,
      getFn: getFn,
      threshold: 0.1,
      ignoreLocation: true,
      keys: ["file.path"],
    };
    let flattenedItems = getItems(this.rootEl._children);
    const fuse = new Fuse(flattenedItems, options);
    const maxResults = 200;
    let results = fuse.search(this.filter).slice(0, maxResults);
    if (supportsVirtualChildren) {
      this.rootEl.vChildren._children = highlight(results);
    } else {
      this.rootEl.children = highlight(results);
    }
  } else if (this.filter?.length < 1 && this.filtered) {
    if (this.rootEl._children) {
      if (supportsVirtualChildren) {
        this.rootEl.vChildren._children = this.rootEl._children;
      } else {
        this.rootEl.children = this.rootEl._children;
      }
    }

    let flattenedItems = getItems(this.rootEl._children);
    flattenedItems.map((match: any) => {
      if (match.innerEl.origContent) {
        match.innerEl.setText(match.innerEl.origContent);
        delete match.innerEl.origContent;
        match.innerEl.removeClass("has-matches");
      }
    });

    this.filtered = false;
  }
};
