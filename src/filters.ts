import { FileExplorerView } from "obsidian";
import { getFn, getItems, highlight } from "./utils";
import Fuse from "fuse.js";

// Assuming 'around' is a utility function you may have elsewhere
import { around } from "monkey-around"

export function fileExplorerFilter(this: any, fileExplorer: FileExplorerView, requireApiVersion: Function) {
  if (!fileExplorer) return;
  const supportsVirtualChildren = requireApiVersion("0.15.0");

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
}

export function setupFileExplorerFilter(fileExplorer: FileExplorerView, plugin: any, settings: any, addSortButton: Function, requireApiVersion: Function) {
  let InfinityScroll = fileExplorer.tree.infinityScroll.constructor;
  plugin.register(
    around(InfinityScroll.prototype, {
      compute(old: any) {
        return function (...args: any[]) {
          try {
            if (this.scrollEl.hasClass("nav-files-container")) {
              fileExplorerFilter.call(this, fileExplorer, requireApiVersion);
            }
          } catch (err) {
            console.error(err);
          }
          return old.call(this, ...args);
        };
      },
    })
  );

  // Patching the addSortButton function
  plugin.register(
    around(fileExplorer.headerDom.constructor.prototype, {
      addSortButton(old: any) {
        return function (...args: any[]) {
          if (this.navHeaderEl?.parentElement?.dataset?.type === "file-explorer") {
            plugin.setFileExplorerFilter(this);  // Assumes setFileExplorerFilter is a method in your main plugin
            return addSortButton.call(this, settings, ...args);
          } else {
            return old.call(this, ...args);
          }
        };
      },
    })
  );
}
