import "obsidian";
import Sortable from "sortablejs";

declare module "obsidian" {

  export interface ColorComponent extends ValueComponent<string> {
    onChange(callback: (value: string) => any): this;
  }

  export interface Setting {
    addColorPicker(cb: (component: ColorComponent) => any): this;
  }
  
  export interface Workspace extends Events {
    on(name: "status-bar-updated", callback: () => any, ctx?: any): EventRef;
    on(name: "ribbon-bar-updated", callback: () => any, ctx?: any): EventRef;
    on(name: "QArrange-workspace-change", callback: () => any, ctx?: any): EventRef;
    on(
      name: "QArrange-leaf-split",
      callback: (originLeaf: WorkspaceItem, newLeaf: WorkspaceItem) => any,
      ctx?: any
    ): EventRef;
  }

  interface Vault {
    getConfig(config: String): unknown;
    setConfig(config: String, value: any): void;
  }
  interface View {
    actionsEl: HTMLElement;
    iconSorter?: Sortable;
  }
  interface WorkspaceLeaf {
    tabHeaderEl: HTMLElement;
    parentSplit: WorkspaceSplit;
    iconSorter?: Sortable;
  }
  interface WorkspaceSplit {
    children: WorkspaceTabs[];
  }
  interface WorkspaceItem {
    tabsInnerEl: HTMLElement;
    view: View;
    type: string;
  }
  interface WorkspaceTabs {
    children: WorkspaceLeaf[];
    component: Component;
    currentTab: number;
    iconSorter?: Sortable;
    recomputeChildrenDimensions(): void;
    updateDecorativeCurves(): void;
  }
    interface App {
        plugins: {
            enabledPlugins: Set<string>;
            disabledPlugins: Set<string>;
            loadPlugin(pluginId: string): Promise<void>;
            unloadPlugin(pluginId: string): Promise<void>;
            enablePlugin(pluginId: string): Promise<void>;
            disablePlugin(pluginId: string): Promise<void>;
        };
    }
}
