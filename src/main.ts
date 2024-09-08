import { around } from "monkey-around";
import { ChildElement, FileExplorerHeader, FileExplorerView, Platform, Plugin, RootElements, Scope, SplitDirection, TFolder, TFile, TAbstractFile, Vault, View, ViewCreator, Workspace, WorkspaceItem, WorkspaceLeaf, WorkspaceSplit, WorkspaceTabs, requireApiVersion, setIcon } from "obsidian";
import Sortable, { MultiDrag } from "sortablejs";
import { setupFileExplorerFilter } from "./filters";  
import { addSortButton, folderSort } from "./file-explorer/custom-sort";
import { AestheticsManager } from "./aesthetics";
import { QArrangeSettings, DEFAULT_SETTINGS, SettingTab } from "./settings/settings";
import {
  GenerateIdOptions,
  generateId,
  getNextSiblings,
  getPreviousSiblings,
  reorderArray,
} from "./utils";

Sortable.mount(new MultiDrag());

const STATUS_BAR_SELECTOR = "body > div.app-container div.status-bar";
const RIBBON_BAR_SELECTOR = "body > div.app-container div.side-dock-actions";
const DRAG_DELAY = Platform.isMobile ? 200 : 200;
const ANIMATION_DURATION = 500;
export const ROOT_KEY = "/";

export default class QuickArrange extends Plugin {
  statusBarSorter: Sortable;
  ribbonBarSorter: Sortable;
  fileSorter: Sortable;
  separator: HTMLElement;
  settings: QArrangeSettings;
  settingsTab: SettingTab;
  fileExplorer: FileExplorerView | null = null;
  filePositions: Map<string, number>;

  aestheticsManager: AestheticsManager;
  

  async onload() {
    await this.loadSettings();
    this.updateDragDropBehavior();
    this.registerMonkeyPatches();
    this.registerEventHandlers();
    this.registerSettingsTab();
  
    this.aestheticsManager = new AestheticsManager(this.app, this.settings);

    // Force reload of settings
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    console.log("Settings loaded:", JSON.stringify(this.settings));

    this.filePositions = new Map();
    this.initializeFilePositions();
  
    // Add CSS to hide file explorer initially
    document.body.classList.add('quick-arrange-loading');
    this.setupMutationObserver();
  
    // Start initialization immediately
    this.initializeWhenReady();
  
    this.app.workspace.onLayoutReady(() => {
      setTimeout(() => {
        this.initialize();
        this.setFileExplorerSorter(); // Apply custom sorter
        this.refreshFileExplorer(); // Apply both root and subfolder orders
      }, 1000);
    });

    this.addCommand({
      id: 'manual-refresh-file-explorer',
      name: 'Manually Refresh File Explorer',
      callback: async () => {
        console.log("Manual refresh initiated");
        await this.refreshFileExplorer();
        console.log("Manual refresh completed");
        await this.checkFileExplorerConsistency('manual refresh', this.app.vault.getRoot());
      }
    });
  
    const fileExplorer = this.getFileExplorer();
    if (fileExplorer) {
      this.patchFileExplorer(fileExplorer);
    } else {
      console.warn("File explorer not found during plugin load");
    }
  
    this.registerEvent(
      this.app.workspace.on("file-explorer-draggable-change", value => {
        this.toggleFileExplorerSorters(value);
      })
    );
  
    this.registerEvent(
      this.app.vault.on('rename', (file, oldPath) => {
        this.updateFileOrder(file, oldPath);
      })
    );
  
    this.registerEvent(
      this.app.vault.on('delete', (file) => {
        this.handleFileDelete(file);
      })
    );
  
    this.registerEvent(
      this.app.vault.on('create', (file) => {
        this.handleFileCreate(file);
      })
    );
  
    // Register a command to manually refresh the file explorer
    this.addCommand({
      id: 'refresh-file-explorer',
      name: 'Refresh File Explorer',
      callback: () => this.refreshFileExplorer(),
    });
  
    console.log('Quick Arrange plugin loaded');
  }

  private initializeFilePositions() {
    Object.entries(this.settings.fileExplorerOrder).forEach(([folderPath, order]) => {
      order.forEach((fileName, index) => {
        const filePath = folderPath === ROOT_KEY ? fileName : `${folderPath}/${fileName}`;
        this.filePositions.set(filePath, index);
      });
    });
  }
  
  private initializeWhenReady() {
    if (this.app.workspace.layoutReady) {
      this.initialize();
    } else {
      this.app.workspace.onLayoutReady(() => this.initialize());
    }
  }
  
  private showFileExplorer() {
    setTimeout(() => {
      document.body.classList.remove('quick-arrange-loading');
      const navFilesContainer = document.querySelector('.nav-files-container');
      if (navFilesContainer) {
        navFilesContainer.classList.add('is-ready');
      }
    }, 100);
  }
  
  private setupMutationObserver() {
    const targetNode = document.body;
    const config = { childList: true, subtree: true };
  
    const callback = (mutationsList: MutationRecord[], observer: MutationObserver) => {
      for (let mutation of mutationsList) {
        if (mutation.type === 'childList') {
          const addedNodes = Array.from(mutation.addedNodes);
          const fileExplorerNode = addedNodes.find(node => 
            node instanceof Element && node.matches('.nav-files-container')
          );
          if (fileExplorerNode) {
            this.initialize();
            observer.disconnect(); // Stop observing once we've found the file explorer
            break;
          }
        }
      }
    };
  
    const observer = new MutationObserver(callback);
    observer.observe(targetNode, config);
  }

  private async handleDragEnd(evt: Sortable.SortableEvent, folderPath: string) {
    const currentOrder = this.getCurrentFolderOrder(evt.to);
    this.settings.fileExplorerOrder[folderPath] = currentOrder;
    this.updateFilePositions(folderPath);
    await this.saveSettings();
    await this.refreshFileExplorer(folderPath);
  }
  
  private async handleDragAdd(evt: Sortable.SortableEvent, newFolderPath: string) {
    const itemPathElement = evt.item.querySelector('.nav-file-title[data-path], .nav-folder-title[data-path]');
    if (!itemPathElement) {
      console.error("Dragged item does not contain a data-path attribute.");
      return;
    }
  
    const itemPath = itemPathElement.getAttribute('data-path');
    if (!itemPath) {
      console.error("Invalid item path: path is null or undefined");
      return;
    }
  
    const fileName = itemPath.split('/').pop() || '';
    const oldFolderPath = itemPath.substring(0, itemPath.lastIndexOf('/')) || ROOT_KEY;
  
    // Store the current root order before any changes
    const originalRootOrder = [...this.settings.fileExplorerOrder[ROOT_KEY]];
  
    // Remove from old folder order
    this.updateFolderOrder(oldFolderPath, fileName, 'remove');
  
    // Calculate the correct new index
    let newIndex = Array.from(evt.to.children).indexOf(evt.item);
    
    // Adjust index for all cases, including root to subfolder
    if (newFolderPath !== oldFolderPath) {
      newIndex = Math.max(0, newIndex - 1);
    }
  
    // Add to new folder order at the correct position
    this.updateFolderOrderAtPosition(newFolderPath, fileName, newIndex);
  
    const success = await this.moveFile(itemPath, newFolderPath);
    if (success) {
      // Capture the current order of the new folder
      const newFolderOrder = this.getCurrentFolderOrder(evt.to);
      this.settings.fileExplorerOrder[newFolderPath] = newFolderOrder;
      this.updateFilePositions(newFolderPath);
  
      // Restore the original root order, minus the moved file
      if (oldFolderPath === ROOT_KEY) {
        this.settings.fileExplorerOrder[ROOT_KEY] = originalRootOrder.filter(item => item !== fileName);
        this.updateFilePositions(ROOT_KEY);
      }
    } else {
      console.error("Failed to move file. Reverting order changes.");
      this.updateFolderOrder(oldFolderPath, fileName, 'add');
      this.updateFolderOrder(newFolderPath, fileName, 'remove');
      this.updateFilePositions(oldFolderPath);
      this.updateFilePositions(newFolderPath);
    }
  
    await this.saveSettings();
    await this.refreshFileExplorer();
    
  
    console.log(`Moved ${fileName} from ${oldFolderPath} to ${newFolderPath} at index ${newIndex}`);
    console.log(`New folder order: ${JSON.stringify(this.settings.fileExplorerOrder[newFolderPath])}`);
  }

  private getFolderByPath(fileExplorer: FileExplorerView, folderPath: string): RootElements | ChildElement | null {
    if (folderPath === '') {
      return fileExplorer.tree.infinityScroll.rootEl;
    }
  
    const roots = this.getRootFolders(fileExplorer);
    if (roots) {
      for (let root of roots) {
        if (root.file && root.file.path === folderPath) {
          return root;
        }
      }
    }
  
    return null;
  }

  // Root directory handling logic
  getCurrentRootOrder(): string[] {
    const rootFiles = this.app.vault.getRoot().children;
    return rootFiles
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
      .map(file => file.name);
  }

  handleRootDirectory() {
    const rootOrder = this.settings.fileExplorerOrder[ROOT_KEY];
    if (rootOrder) {
      const fileExplorer = this.getFileExplorer();
      if (fileExplorer?.tree?.infinityScroll?.rootEl) {
        this.recomputeChildrenOrder(fileExplorer.tree.infinityScroll.rootEl.vChildren._children, rootOrder);
        fileExplorer.tree.infinityScroll.compute();
      }
    }
  }

  async handleFileCreate(file: TAbstractFile) {
    console.log(`File creation started: ${file.path}`);
    const startTime = performance.now();
  
    const fileName = file.name;
    const parentPath = file.parent ? file.parent.path : ROOT_KEY;
    
    this.updateFolderOrderForNewFile(parentPath, fileName);
    
    await this.saveSettings();
    this.refreshFileExplorer(parentPath);
  
    const endTime = performance.now();
    console.log(`File creation completed: ${file.path}. Time taken: ${endTime - startTime}ms`);
    
    await this.checkFileExplorerConsistency('create', file);
  
    // Schedule a delayed second refresh
    setTimeout(async () => {
      console.log(`Performing delayed refresh for: ${file.path}`);
      this.refreshFileExplorer(parentPath);
      console.log(`Delayed refresh completed for: ${file.path}`);
      await this.checkFileExplorerConsistency('delayed refresh', file);
    }, 500); // 500ms delay, adjust as needed
  }
  
  private handleFileDelete(file: TAbstractFile) {
    console.log(`File deletion started: ${file.path}`);
    const startTime = performance.now();
  
    const fileName = file.name;
    const parentPath = file.parent ? file.parent.path : ROOT_KEY;
    
    // Remove the file from the folder order
    this.updateFolderOrder(parentPath, fileName, 'remove');
    
    // Save the settings
    this.saveSettings();
  
    // Schedule an immediate refresh
    this.refreshFileExplorer(parentPath);
  
    // Schedule a delayed second refresh
    setTimeout(() => {
      console.log(`Performing delayed refresh after deletion of: ${file.path}`);
      this.refreshFileExplorer(parentPath);
    }, 100); 
  
    const endTime = performance.now();
    console.log(`File deletion handling completed: ${file.path}. Time taken: ${endTime - startTime}ms`);
  }
  
  
  private updateFolderOrderForNewFile(folderPath: string, fileName: string) {
    if (!this.settings.fileExplorerOrder[folderPath]) {
      this.settings.fileExplorerOrder[folderPath] = [];
    }
    
    const order = this.settings.fileExplorerOrder[folderPath];
    
    if (!order.includes(fileName)) {
      // Add new files to the beginning of the list
      order.unshift(fileName);
    }
  
    // Ensure the order is saved
    this.settings.fileExplorerOrder[folderPath] = order;
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    const fileExplorer = this.getFileExplorer();
    if (fileExplorer) {
      const captureOrder = (folder: RootElements | ChildElement, folderPath: string) => {
        if (folder.childrenEl) {
          const order = this.getCurrentFolderOrder(folder.childrenEl);
          this.settings.fileExplorerOrder[folderPath] = order;
        }
      };
  
      // Capture root order
      captureOrder(fileExplorer.tree.infinityScroll.rootEl, '');
  
      // Capture subfolder orders
      const roots = this.getRootFolders(fileExplorer);
      if (roots?.length) {
        for (let root of roots) {
          if (root.file && root.file.path !== '') {
            captureOrder(root, root.file.path);
          }
        }
      }
    }
  
    await this.saveData(this.settings);
    this.aestheticsManager.updateStyles();
  }

  patchFileExplorerFolder() {
    let plugin = this;
    let leaf = plugin.app.workspace.getLeaf(true);
    let fileExplorer = plugin.app.viewRegistry.viewByType["file-explorer"](leaf) as FileExplorerView;
    // @ts-ignore
    let tmpFolder = new TFolder(Vault, "");
    let Folder = fileExplorer.createFolderDom(tmpFolder).constructor;
    this.register(
      around(Folder.prototype, {
        sort(old: any) {
          return function (...args: any[]) {
            let order = plugin.settings.fileExplorerOrder[this.file.path];
            if (plugin.settings.sortOrder === "custom") {
              return folderSort.call(this, order, ...args);
            } else {
              return old.call(this, ...args);
            }
          };
        },
      })
    );
    leaf.detach();
  }

  initialize() {
    this.app.workspace.onLayoutReady(() => {
        setTimeout(() => {
            this.patchFileExplorerFolder();
            
            if (Platform.isDesktop) {
                // add sorter to the status bar
                this.insertSeparator(STATUS_BAR_SELECTOR, "status-bar-item", true, 16);
                this.setStatusBarSorter();

                // add sorter to the sidebar tabs
                if (requireApiVersion && !requireApiVersion("0.15.3")) {
                    let left = (this.app.workspace.leftSplit as WorkspaceSplit).children;
                    let right = (this.app.workspace.rightSplit as WorkspaceSplit).children;
                    left.concat(right).forEach(child => {
                        if (child.hasOwnProperty("tabsInnerEl") && !child.iconSorter) {
                            child.iconSorter = this.setTabBarSorter(child.tabsInnerEl, child);
                        }
                    });
                }
            }

            // add file explorer sorter
            this.setFileExplorerSorter();

            // add sorter to the left sidebar ribbon
            this.insertSeparator(RIBBON_BAR_SELECTOR, "side-dock-ribbon-action", false, 18);
            this.setRibbonBarSorter();

            // Apply custom sorting and refresh the file explorer
            this.refreshFileExplorer();
            
            // Show the file explorer
            this.showFileExplorer();
        }, Platform.isMobile ? 3000 : 400);
    });
}


  registerSettingsTab() {
    this.settingsTab = new SettingTab(this.app, this);
    this.addSettingTab(this.settingsTab);
  }


  registerEventHandlers() {
    this.registerEvent(
      this.app.workspace.on("file-explorer-draggable-change", value => {
        this.toggleFileExplorerSorters(value);
      })
    );
    this.registerEvent(
      this.app.workspace.on("file-explorer-sort-change", (sortMethod: string) => {
        this.settings.sortOrder = sortMethod
        this.saveSettings();
        if (sortMethod === "custom") {
          setTimeout(() => {
            this.setFileExplorerSorter();
          }, 10);
        } else {
          this.cleanupFileExplorerSorters();
        }
      })
    );
    this.registerEvent(
      this.app.workspace.on("file-explorer-load", (fileExplorer: FileExplorerView) => {
        setTimeout(() => {
          this.setFileExplorerSorter(fileExplorer);
        }, 1000);
      })
    );
    this.registerEvent(
      this.app.workspace.on("QArrange-leaf-split", (originLeaf: WorkspaceItem, newLeaf: WorkspaceItem) => {
        let element: HTMLElement = newLeaf.tabsInnerEl as HTMLElement;
        if (newLeaf.type === "tabs" && newLeaf instanceof WorkspaceTabs) {
          if (requireApiVersion && !requireApiVersion("0.15.3")) {
            this.setTabBarSorter(element, newLeaf);
          }
        }
      })
    );

    this.registerEvent(
      this.app.workspace.on("ribbon-bar-updated", () => {
        setTimeout(() => {
          if (this.settings.ribbonBarOrder && this.ribbonBarSorter) {
            this.setElementIDs(this.ribbonBarSorter.el, { useClass: true, useAria: true, useIcon: true });
            this.ribbonBarSorter.sort(this.settings.ribbonBarOrder);
          }
        }, 0);
      })
    );
    this.registerEvent(
      this.app.workspace.on("status-bar-updated", () => {
        setTimeout(() => {
          if (this.settings.statusBarOrder && this.statusBarSorter) {
            this.setElementIDs(this.statusBarSorter.el, { useClass: true, useIcon: true });
            this.statusBarSorter.sort(this.settings.statusBarOrder);
          }
        }, 0);
      })
    );
  }

  registerMonkeyPatches() {
    const plugin = this;
    this.register(
      around(this.app.viewRegistry.constructor.prototype, {
        registerView(old: any) {
          return function (type: string, viewCreator: ViewCreator, ...args: unknown[]) {
            plugin.app.workspace.trigger("view-registered", type, viewCreator);
            return old.call(this, type, viewCreator, ...args);
          };
        },
      })
    );
    
    if (!this.app.workspace.layoutReady) {
      let eventRef = this.app.workspace.on("view-registered", (type: string, viewCreator: ViewCreator) => {
        if (type !== "file-explorer") return;
        this.app.workspace.offref(eventRef);
        // @ts-ignore a leaf before any leafs exists in the workspace, create one from scratch
        let leaf = new WorkspaceLeaf(plugin.app);
        let fileExplorer = viewCreator(leaf) as FileExplorerView;
        this.patchFileExplorer(fileExplorer);
      });
    } else {
      let fileExplorer = this.getFileExplorer();
      this.patchFileExplorer(fileExplorer);
    }
    this.register(
      around(View.prototype, {
        onunload(old: any) {
          return function (...args) {
            try {
              if (this.iconSorter) {
                this.iconSorter.destroy();
                this.iconSorter = null;
              }
            } catch {}
            return old.call(this, ...args);
          };
        },
        onload(old: any) {
          return function (...args) {
            setTimeout(() => {
              if (this.app.workspace.layoutReady) {
                try {
                  if (!(this.leaf.parentSplit instanceof WorkspaceTabs)) {
                    if (this.hasOwnProperty("actionsEl") && !this.iconSorter) {
                      this.iconSorter = plugin.setViewActionSorter(this.actionsEl, this);
                    }
                  }
                } catch {}
              }
            }, 200);

            return old.call(this, ...args);
          };
        },
      })
    );
    if (Platform.isDesktop) {
      this.register(
        around(HTMLDivElement.prototype, {
          addEventListener(old: any) {
            return function (
              type: string,
              listener: EventListenerOrEventListenerObject,
              options?: boolean | AddEventListenerOptions
            ) {
              if (type === "mousedown" && listener instanceof Function && this.hasClass("workspace-tab-header")) {
                let origListener = listener;
                listener = event => {
                  if (event instanceof MouseEvent && (event?.altKey || event?.metaKey)) return;
                  else origListener(event);
                };
              }
              const result = old.call(this, type, listener, options);
              return result;
            };
          },
        })
      );
    }
    this.register(
      around(Workspace.prototype, {
        splitLeaf(old: any) {
          return function (
            source: WorkspaceItem,
            newLeaf: WorkspaceItem,
            direction?: SplitDirection,
            before?: boolean,
            ...args
          ) {
            let result = old.call(this, source, newLeaf, direction, before, ...args);
            this.trigger("QArrange-leaf-split", source, newLeaf);
            return result;
          };
        },
        changeLayout(old: any) {
          return async function (workspace: any, ...args): Promise<void> {
            let result = await old.call(this, workspace, ...args);
            this.trigger("QArrange-workspace-change");
            return result;
          };
        },
      })
    );
    this.register(
      around(Plugin.prototype, {
        addStatusBarItem(old: any) {
          return function (...args): HTMLElement {
            const result = old.call(this, ...args);
            this.app.workspace.trigger("status-bar-updated");
            return result;
          };
        },
        addRibbonIcon(old: any) {
          return function (...args): HTMLElement {
            const result = old.call(this, ...args);
            this.app.workspace.trigger("ribbon-bar-updated");
            return result;
          };
        },
      })
    );
  }

  patchFileExplorer(fileExplorer: FileExplorerView) {
    if (fileExplorer) {
      setupFileExplorerFilter(fileExplorer, this, this.settings, addSortButton, requireApiVersion);
    }
  }


  insertSeparator(selector: string, className: string, rtl: Boolean, glyphSize: number = 16) {
    let elements = document.body.querySelectorAll(selector);
    elements.forEach((el: HTMLElement) => {
      let getSiblings = rtl ? getPreviousSiblings : getNextSiblings;
      if (el) {
        let separator = el.createDiv(`${className} separator`);
        rtl && el.prepend(separator);
        let glyphEl = separator.createDiv("glyph");
        let glyphName = "plus-with-circle"; // ABY Note: replace using CSS 
        // TODO: Handle mobile icon size differences?
        setIcon(glyphEl, glyphName, glyphSize);
        separator.addClass("is-collapsed");
        this.register(() => separator.detach());
        let hideTimeout: NodeJS.Timeout;
        separator.onClickEvent((event: MouseEvent) => {
          if (separator.hasClass("is-collapsed")) {
            Array.from(el.children).forEach(el => el.removeClass("is-hidden"));
            separator.removeClass("is-collapsed");
          } else {
            getSiblings(separator).forEach(el => el.addClass("is-hidden"));
            separator.addClass("is-collapsed");
          }
        });
        el.onmouseenter = ev => {
          hideTimeout && clearTimeout(hideTimeout);
        };
        el.onmouseleave = ev => {
          if (this.settings.autoHide) {
            hideTimeout = setTimeout(() => {
              getSiblings(separator).forEach(el => el.addClass("is-hidden"));
              separator.addClass("is-collapsed");
            }, this.settings.autoHideDelay);
          }
        };
        setTimeout(() => {
          getSiblings(separator).forEach(el => el.addClass("is-hidden"));
          separator.addClass("is-collapsed");
        }, 0);
      }
    });
  }

  setElementIDs(parentEl: HTMLElement, options: GenerateIdOptions) {
    Array.from(parentEl.children).forEach(child => {
      if (child instanceof HTMLElement) {
        if (!child.getAttribute("data-id")) {
          child.setAttribute("data-id", generateId(child, options));
        }
      }
    });
  }

  setTabBarSorter(element: HTMLElement, leaf: WorkspaceTabs) {
    this.setElementIDs(element, { useClass: true, useIcon: true });
    let sorter = Sortable.create(element, {
      group: "leftTabBar",
      dataIdAttr: "data-id",
      chosenClass: "bt-sortable-chosen",
      delay: Platform.isMobile ? 200 : this.settings.dragDelay,
      dropBubble: false,
      dragoverBubble: false,
      animation: ANIMATION_DURATION,
      onChoose: () => element.parentElement?.addClass("is-dragging"),
      onUnchoose: () => element.parentElement?.removeClass("is-dragging"),
      onStart: () => {
        document.body.addClass("is-dragging");
        element.querySelector(".separator")?.removeClass("is-collapsed");
        Array.from(element.children).forEach(el => el.removeClass("is-hidden"));
      },
      onEnd: event => {
        document.body.removeClass("is-dragging");
        if (event.oldIndex !== undefined && event.newIndex !== undefined) {
          reorderArray(leaf.children, event.oldIndex, event.newIndex);
          leaf.currentTab = event.newIndex;
          leaf.recomputeChildrenDimensions();
        }
        this.app.workspace.requestSaveLayout();
      },
    });
    return sorter;
  }

  setStatusBarSorter() {
    let el = document.body.querySelector("body > div.app-container > div.status-bar") as HTMLElement;
    if (el) {
      this.setElementIDs(el, { useClass: true, useAria: true, useIcon: true });
      this.statusBarSorter = Sortable.create(el, {
        group: "statusBar",
        dataIdAttr: "data-id",
        chosenClass: "bt-sortable-chosen",
        delay: Platform.isMobile ? 200 : this.settings.dragDelay,
        animation: ANIMATION_DURATION,
        onChoose: () => {
          Array.from(el.children).forEach(el => el.removeClass("is-hidden"));
        },
        onStart: () => {
          el.querySelector(".separator")?.removeClass("is-collapsed");
          Array.from(el.children).forEach(el => el.removeClass("is-hidden"));
        },
        store: {
          get: sortable => {
            return this.settings.statusBarOrder;
          },
          set: s => {
            this.settings.statusBarOrder = s.toArray();
            this.saveSettings();
          },
        },
      });
    }
  }

  setViewActionSorter(el: HTMLElement, view: View): Sortable | undefined {
    this.setElementIDs(el, { useClass: true, useIcon: true });
    let hasSorter = Object.values(el).find(value => value?.hasOwnProperty("nativeDraggable"));
    if (hasSorter) return undefined;
    let viewType = view?.getViewType() || "unknown";
    let sortable = new Sortable(el, {
      group: "actionBar",
      dataIdAttr: "data-id",
      chosenClass: "bt-sortable-chosen",
      delay: Platform.isMobile ? 200 : this.settings.dragDelay,
      sort: true,
      animation: ANIMATION_DURATION,
      onStart: () => {
        el.querySelector(".separator")?.removeClass("is-collapsed");
        Array.from(el.children).forEach(el => el.removeClass("is-hidden"));
      },
      store: {
        get: () => {
          return this.settings.actionBarOrder[viewType];
        },
        set: s => {
          this.settings.actionBarOrder[viewType] = s.toArray();
          this.saveSettings();
        },
      },
    });
    return sortable;
  }

  setRibbonBarSorter() {
    let el = document.body.querySelector("body > div.app-container div.side-dock-actions") as HTMLElement;
    if (el) {
      this.setElementIDs(el, { useClass: true, useAria: true, useIcon: true });
      this.ribbonBarSorter = Sortable.create(el, {
        group: "ribbonBar",
        dataIdAttr: "data-id",
        delay: Platform.isMobile ? 200 : this.settings.dragDelay,
        chosenClass: "bt-sortable-chosen",
        animation: ANIMATION_DURATION,
        onChoose: () => {
          Array.from(el.children).forEach(el => el.removeClass("is-hidden"));
        },
        onStart: () => {
          el.querySelector(".separator")?.removeClass("is-collapsed");
          Array.from(el.children).forEach(el => el.removeClass("is-hidden"));
        },
        store: {
          get: sortable => {
            return this.settings.ribbonBarOrder;
          },
          set: s => {
            this.settings.ribbonBarOrder = s.toArray();
            this.saveSettings();
          },
        },
      });
    }
  }

  setFileExplorerFilter(headerDom: FileExplorerHeader) {
    let fileExplorerNav = headerDom.navHeaderEl;
    if (fileExplorerNav) {
      let fileExplorerFilter = fileExplorerNav.createDiv("search-input-container");
      fileExplorerNav.insertAdjacentElement("afterend", fileExplorerFilter);
      let fileExplorerFilterInput = fileExplorerFilter.createEl("input");
      fileExplorerFilterInput.placeholder = "Type to filter...";
      fileExplorerFilterInput.type = "text";
      fileExplorerFilter.hide();
      let filterScope = new Scope(this.app.scope);
      fileExplorerFilterInput.onfocus = () => {
        this.app.keymap.pushScope(filterScope);
      }
      fileExplorerFilterInput.onblur = () => {
        this.app.keymap.popScope(filterScope);
      }
      fileExplorerFilterInput.oninput = (ev: InputEvent) => {
        let fileExplorer = this.getFileExplorer();
        if (ev.target instanceof HTMLInputElement) {
          if (ev.target.value.length) {
            clearButtonEl.show();
          } else {
            clearButtonEl.hide();
          }
          fileExplorer.tree.infinityScroll.filter = ev.target.value;
        }
        fileExplorer.tree.infinityScroll.compute();
      };
      let clearButtonEl = fileExplorerFilter.createDiv("search-input-clear-button", function (el) {
        el.addEventListener("click", function () {
          (fileExplorerFilterInput.value = ""), clearButtonEl.hide();
          fileExplorerFilterInput.focus();
          fileExplorerFilterInput.dispatchEvent(new Event("input"));
        }),
          el.hide();
      });
    }
  }

  updateDragDropBehavior() {
    const fileExplorer = this.getFileExplorer();
    if (fileExplorer) {
      // Destroy existing sorters
      this.cleanupFileExplorerSorters();
      
      // Re-create sorters with new settings
      this.setFileExplorerSorter(fileExplorer);
      
      // Update draggable attribute on all file and folder titles
      const titles = fileExplorer.containerEl.querySelectorAll('.nav-file-title, .nav-folder-title');
      titles.forEach((title: HTMLElement) => {
        title.draggable = !this.settings.useOnlyCustomDragDrop;
      });
  
      // If using only custom drag and drop, ensure Sortable instances are enabled
      if (this.settings.useOnlyCustomDragDrop) {
        this.toggleFileExplorerSorters(true);
      }
    }
  }

  setFileExplorerSorter(fileExplorer?: FileExplorerView) {
    if (!fileExplorer) fileExplorer = this.getFileExplorer();
    if (!fileExplorer || this.settings.sortOrder !== "custom" || fileExplorer.hasCustomSorter) return;
  
    // Handle root directory
    const rootEl = fileExplorer.tree?.infinityScroll?.rootEl;
    if (rootEl && rootEl.childrenEl) {
      this.setFolderSorter(rootEl, ROOT_KEY);
    }
  
    // Handle subfolders
    let roots = this.getRootFolders(fileExplorer);
    if (roots?.length) {
      for (let root of roots) {
        if (root.file && root.file.path !== '') {
          this.setFolderSorter(root, root.file.path);
        }
      }
    }
  
    fileExplorer.hasCustomSorter = true;
  }
  
  private setFolderSorter(folder: RootElements | ChildElement, folderPath: string) {
    let el = folder.childrenEl;
    if (!el) {
      console.error("No childrenEl found for folder:", folderPath);
      return;
    }
  
    let dragEnabled = document.body.querySelector("div.nav-action-button.drag-to-rearrange")?.hasClass("is-active") ?? false;
  
    // Remove existing sorter if it exists
    if (folder.sorter) {
      folder.sorter.destroy();
    }
  
    setTimeout(() => {
      try {
        folder.sorter = Sortable.create(el, {
          group: "fileExplorer",
          animation: ANIMATION_DURATION,
          draggable: ".nav-file, .nav-folder",
          handle: this.settings.useOnlyCustomDragDrop ? ".nav-file-title, .nav-folder-title" : undefined,
          filter: this.settings.useOnlyCustomDragDrop ? undefined : ".nav-file-title-content",
          preventOnFilter: false,
          easing: "cubic-bezier(1, 0, 0, 1)",
          disabled: !dragEnabled,
          delay: this.settings.useOnlyCustomDragDrop ? 0 : DRAG_DELAY,
          delayOnTouchOnly: true,
          touchStartThreshold: 3,
          ghostClass: "sortable-ghost",
          chosenClass: "sortable-chosen",
          dragClass: "sortable-drag",
          onStart: (evt) => {
              console.log("Drag started:", { folderPath, item: evt.item });
              document.body.classList.add('is-dragging');
          },
          onEnd: (evt) => {
              console.log("Drag ended:", { folderPath, newIndex: evt.newIndex });
              this.handleDragEnd(evt, folderPath);
              document.body.classList.remove('is-dragging');
          },
          onAdd: (evt) => {
            console.log("Item added:", { folderPath, newIndex: evt.newIndex });
            this.handleDragAdd(evt, folderPath);
          },
          onUpdate: (evt) => {
            console.log("Order updated:", { folderPath, newIndex: evt.newIndex, oldIndex: evt.oldIndex });
            this.handleDragEnd(evt, folderPath);
          },
        });
  
        console.log("Sortable instance created for:", folderPath);
      } catch (error) {
        console.error("Error creating Sortable instance:", error);
      }
    }, 0);
  }
  
  getAllFolders(fileExplorer: FileExplorerView): (RootElements | ChildElement)[] {
    const rootEl = fileExplorer.tree?.infinityScroll?.rootEl;
    const subfolders = this.getRootFolders(fileExplorer) || [];
    return [rootEl, ...subfolders].filter(folder => folder != null);
  }
  
  private getCurrentFolderOrder(element: Element | undefined): string[] {
    if (!element) return [];
    
    return Array.from(element.children)
      .map(el => {
        const titleEl = el.querySelector('.nav-file-title, .nav-folder-title');
        const path = titleEl?.getAttribute('data-path');
        return path ? path.split('/').pop() || '' : '';
      })
      .filter(name => name !== '');
  }


  recomputeChildrenOrder(children: any[], order: string[]) {
    children.sort((a, b) => {
      const indexA = order.indexOf(a.file.name);
      const indexB = order.indexOf(b.file.name);
      if (indexA === -1 && indexB === -1) {
        // If neither is in the order, maintain their current relative position
        return 0;
      } else if (indexA === -1) {
        // If a is not in the order, put it at the end
        return 1;
      } else if (indexB === -1) {
        // If b is not in the order, put it at the end
        return -1;
      }
      // Both are in the order, sort them accordingly
      return indexA - indexB;
    });
  }

  async updateFileOrder(file: TAbstractFile, oldPath: string) {
    console.log(`File update started: ${oldPath} -> ${file.path}`);
    const startTime = performance.now();
  
    const oldName = oldPath.split('/').pop() || '';
    const newName = file.name;
    const parentPath = file.parent ? file.parent.path : ROOT_KEY;
  
    console.log(`Updating order for folder: ${parentPath}`);
    console.log(`Old internal order:`, JSON.stringify(this.settings.fileExplorerOrder[parentPath]));
  
    if (this.settings.fileExplorerOrder[parentPath]) {
      const order = this.settings.fileExplorerOrder[parentPath];
      const oldIndex = order.indexOf(oldName);
      if (oldIndex !== -1) {
        order[oldIndex] = newName;
        console.log(`Replaced ${oldName} with ${newName} at index ${oldIndex}`);
      } else {
        console.log(`Old filename ${oldName} not found in order, adding ${newName} to the end`);
        order.push(newName);
      }
      this.settings.fileExplorerOrder[parentPath] = order;
      
      this.updateFilePositions(parentPath);
    } else {
      console.log(`No existing order for ${parentPath}, creating new order`);
      this.settings.fileExplorerOrder[parentPath] = [newName];
    }
  
    console.log(`New internal order:`, JSON.stringify(this.settings.fileExplorerOrder[parentPath]));
  
    // Update the filePositions map
    const oldPosition = this.filePositions.get(oldPath);
    if (oldPosition !== undefined) {
      this.filePositions.delete(oldPath);
      this.filePositions.set(file.path, oldPosition);
      console.log(`Updated filePositions: ${oldPath} -> ${file.path}`);
    }
  
    // Force synchronous saving of settings
    let saveAttempts = 0;
    const maxAttempts = 5;
    while (saveAttempts < maxAttempts) {
      try {
        await this.saveData(this.settings);
        console.log(`Settings saved successfully`);
        
        // Verify the save
        const loadedSettings = await this.loadData();
        if (JSON.stringify(loadedSettings.fileExplorerOrder[parentPath]) === JSON.stringify(this.settings.fileExplorerOrder[parentPath])) {
          console.log(`Settings verified successfully`);
          break;
        } else {
          throw new Error("Settings verification failed");
        }
      } catch (error) {
        console.error(`Failed to save settings (attempt ${saveAttempts + 1}):`, error);
        saveAttempts++;
        if (saveAttempts >= maxAttempts) {
          console.error("Max save attempts reached. Unable to save settings.");
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms before retrying
      }
    }
    
    // Force refresh of the specific folder
    await this.refreshFileExplorer(parentPath);
  
    const endTime = performance.now();
    console.log(`File update completed: ${file.path}. Time taken: ${endTime - startTime}ms`);
  
    await this.checkFileExplorerConsistency('update', file);
  }

  private updateFilePositions(folderPath: string) {
    const order = this.settings.fileExplorerOrder[folderPath];
    order.forEach((fileName, index) => {
      const filePath = folderPath === ROOT_KEY ? fileName : `${folderPath}/${fileName}`;
      this.filePositions.set(filePath, index);
    });
  }

  private async checkFileExplorerConsistency(operation: string, file: TAbstractFile) {
    console.log(`Checking file explorer consistency after ${operation} operation on ${file.path}...`);
    const fileExplorer = this.getFileExplorer();
    if (!fileExplorer) {
      console.warn("File explorer not found");
      return;
    }
  
    const checkFolder = (folder: RootElements | ChildElement, folderPath: string) => {
      if (!folder.childrenEl) {
        console.warn(`Children element not found for folder: ${folderPath}`);
        return true; // Assume consistent if we can't check
      }
  
      const domOrder = this.getCurrentFolderOrder(folder.childrenEl);
      const internalOrder = this.settings.fileExplorerOrder[folderPath];
  
      console.log(`Folder: ${folderPath}`);
      console.log("DOM order:", domOrder);
      console.log("Internal order:", internalOrder);
  
      if (JSON.stringify(domOrder) !== JSON.stringify(internalOrder)) {
        console.warn(`Inconsistency detected in folder ${folderPath}`);
        return false;
      }
      return true;
    };
  
    let isConsistent = checkFolder(fileExplorer.tree.infinityScroll.rootEl, ROOT_KEY);
  
    const roots = this.getRootFolders(fileExplorer);
    if (roots?.length) {
      for (let root of roots) {
        if (root.file && root.file.path !== '') {
          isConsistent = isConsistent && checkFolder(root, root.file.path);
        }
      }
    }
  
    if (!isConsistent) {
      console.warn("Inconsistencies detected. Triggering refresh...");
      await this.refreshFileExplorer();
      console.log("Refresh complete");
    } else {
      console.log("File explorer is consistent");
    }
  }

async moveFile(filePath: string, newFolderPath: string): Promise<boolean> {
  console.log("moveFile called with:", { filePath, newFolderPath });

  const abstractFile = this.app.vault.getAbstractFileByPath(filePath);

  if (!abstractFile) {
    console.error("File or folder not found:", filePath);
    return false;
  }

  let success = false;
  if (abstractFile instanceof TFile) {
    // It's a file, move it.
    const fileName = filePath.split('/').pop() || '';
    const newFilePath = newFolderPath === ROOT_KEY ? fileName : `${newFolderPath}/${fileName}`;
    console.log("Moving file to:", newFilePath);
    try {
      await this.app.fileManager.renameFile(abstractFile, newFilePath);
      console.log("File moved successfully");
      success = true;
    } catch (error) {
      console.error("Error moving file:", error);
    }
  } else if (abstractFile instanceof TFolder) {
    // It's a folder, move it.
    const folderName = filePath.split('/').pop() || '';
    const newFolderFullPath = newFolderPath === ROOT_KEY ? folderName : `${newFolderPath}/${folderName}`;
    console.log("Moving folder to:", newFolderFullPath);
    try {
      await this.app.vault.rename(abstractFile, newFolderFullPath);
      console.log("Folder moved successfully");
      success = true;
    } catch (error) {
      console.error("Error moving folder:", error);
    }
  } else {
    console.error("Unsupported file type:", filePath);
  }

  return success;
}
  
private updateFolderOrderAtPosition(folderPath: string, fileName: string, position: number) {
  if (!this.settings.fileExplorerOrder[folderPath]) {
    this.settings.fileExplorerOrder[folderPath] = [];
  }
  
  const order = this.settings.fileExplorerOrder[folderPath];
  const existingIndex = order.indexOf(fileName);
  
  if (existingIndex !== -1) {
    order.splice(existingIndex, 1);
  }
  
  order.splice(position, 0, fileName);
}

private updateFolderOrder(folderPath: string, fileName: string, action: 'add' | 'remove') {
  if (!this.settings.fileExplorerOrder[folderPath]) {
    this.settings.fileExplorerOrder[folderPath] = [];
  }
  
  const order = this.settings.fileExplorerOrder[folderPath];
  
  if (action === 'remove') {
    const index = order.indexOf(fileName);
    if (index !== -1) {
      order.splice(index, 1);
    }
  } else if (action === 'add') {
    if (!order.includes(fileName)) {
      // Add existing files to the end of the list
      order.push(fileName);
    }
  }

  // Ensure the order is saved
  this.settings.fileExplorerOrder[folderPath] = order;
}
  
async refreshFileExplorer(updatedFolderPath?: string) {
  console.log("Refreshing file explorer view", { updatedFolderPath });
  const fileExplorer = this.getFileExplorer();
  if (fileExplorer) {
    const applyOrder = (folder: RootElements | ChildElement, folderPath: string) => {
      console.log(`Applying order for folder: ${folderPath}`);
      if (folder.childrenEl) {
        const order = this.settings.fileExplorerOrder[folderPath];
        if (order && folder.vChildren && folder.vChildren._children) {
          folder.vChildren._children = folder.vChildren._children.filter(child => 
            this.app.vault.getAbstractFileByPath(child.file.path)
          );
          
          // Sort children based on filePositions
          folder.vChildren._children.sort((a, b) => {
            const posA = this.filePositions.get(a.file.path) ?? Infinity;
            const posB = this.filePositions.get(b.file.path) ?? Infinity;
            return posA - posB;
          });
          
          console.log(`Reordered children: ${folder.vChildren._children.map(c => c.file.name)}`);
        }
      }
    };

    // Apply root order
    applyOrder(fileExplorer.tree.infinityScroll.rootEl, ROOT_KEY);

    // Apply subfolder orders
    const roots = this.getRootFolders(fileExplorer);
    if (roots?.length) {
      for (let root of roots) {
        if (root.file && root.file.path !== '') {
          applyOrder(root, root.file.path);
        }
      }
    }

    // Force a re-render of the file explorer
    fileExplorer.tree.infinityScroll.compute();

    console.log("File explorer view refreshed");
  } else {
    console.warn("File explorer view not found");
  }
}

  getFileExplorer() {
    let fileExplorer: FileExplorerView | undefined = this.app.workspace.getLeavesOfType("file-explorer")?.first()
      ?.view as unknown as FileExplorerView;
    return fileExplorer;
  }

  getRootFolders(fileExplorer?: FileExplorerView): [RootElements | ChildElement] | undefined {
    if (!fileExplorer) fileExplorer = this.getFileExplorer();
    if (!fileExplorer) return;
    let root = fileExplorer.tree?.infinityScroll?.rootEl;
    let roots = root && this.traverseRoots(root);
    return roots;
  }

  traverseRoots(root: RootElements | ChildElement, items?: [RootElements | ChildElement]) {
    if (!items) items = [root];
    const supportsVirtualChildren = requireApiVersion && requireApiVersion("0.15.0");
    const _children = supportsVirtualChildren ? root.vChildren?._children : root.children;
    for (let child of _children || []) {
      if (child.children || child.vChildren?._children) {
        items.push(child);
      }
      this.traverseRoots(child, items);
    }
    return items;
  }

  toggleFileExplorerSorters(enable: boolean) {
    let fileExplorer = this.getFileExplorer();
    let roots = this.getRootFolders(fileExplorer);
    if (roots?.length) {
      for (let root of roots) {
        if (root.sorter) {
          root.sorter.option("disabled", !enable);
        }
      }
    }
    // Also toggle the root folder sorter
    if (fileExplorer?.tree?.infinityScroll?.rootEl.sorter) {
      fileExplorer.tree.infinityScroll.rootEl.sorter.option("disabled", !enable);
    }
  }

  cleanupFileExplorerSorters() {
    let fileExplorer = this.getFileExplorer();
    let roots = this.getRootFolders(fileExplorer);
    if (roots?.length) {
      for (let root of roots) {
        if (root.sorter) {
          root.sorter.destroy();
          delete root.sorter;
          Object.keys(root.childrenEl!).forEach(
            key => key.startsWith("Sortable") && delete (root.childrenEl as any)[key]
          );
          // sortable.destroy removes all of the draggble attributes :( so we put them back
          root
            .childrenEl!.querySelectorAll("div.nav-file-title")
            .forEach((el: HTMLDivElement) => (el.draggable = true));
          root
            .childrenEl!.querySelectorAll("div.nav-folder-title")
            .forEach((el: HTMLDivElement) => (el.draggable = true));
        }
      }
    }
    delete fileExplorer.hasCustomSorter;
    // unset "custom" file explorer sort
    if (this.app.vault.getConfig("fileSortOrder") === "custom") {
      fileExplorer.setSortOrder("alphabetical");
    }
  }

  async onunload(): Promise<void> {
    this.statusBarSorter?.destroy();
    this.ribbonBarSorter?.destroy();
    this.app.workspace.iterateAllLeaves(leaf => {
        let sorterParent: View | WorkspaceTabs | WorkspaceLeaf | boolean;
        if (
            (sorterParent = leaf?.iconSorter ? leaf : false) ||
            (sorterParent = leaf?.view?.iconSorter ? leaf.view : false) ||
            (sorterParent =
                leaf?.parentSplit instanceof WorkspaceTabs && leaf?.parentSplit?.iconSorter ? leaf?.parentSplit : false)
        ) {
            try {
                sorterParent.iconSorter?.destroy();
            } catch (err) {
            } finally {
                delete sorterParent.iconSorter;
            }
        }
    });

    // clean up file explorer sorters
    this.cleanupFileExplorerSorters();

    // Unload the plugin using the Plugin Manager
    const pluginId = 'quick-arrange'; // Replace with your plugin's ID
    await this.app.plugins.unloadPlugin(pluginId);
}

async unpatchFileExplorer(fileExplorer: FileExplorerView) {
    // Remove custom sort button
    const lastChild = fileExplorer.headerDom.navHeaderEl.lastChild;
    if (lastChild) {
        fileExplorer.headerDom.navHeaderEl.removeChild(lastChild);
    }
}
}