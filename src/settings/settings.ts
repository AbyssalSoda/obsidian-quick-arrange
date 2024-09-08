import { App, PluginSettingTab, Setting } from "obsidian";
import QuickArrange from "../main";

export interface QArrangeSettings {
  statusBarOrder: string[];
  ribbonBarOrder: string[];
  fileExplorerOrder: Record<string, string[]>;
  actionBarOrder: Record<string, string[]>;
  autoHide: boolean;
  autoHideDelay: number;
  dragDelay: number;
  sortOrder:string;

  useOnlyCustomDragDrop: boolean;
  dragDropColor: string;
  hoverColor: string;
}

export const DEFAULT_SETTINGS: QArrangeSettings = {
  statusBarOrder: [],
  ribbonBarOrder: [],
  fileExplorerOrder: {},
  actionBarOrder: {},
  autoHide: false,
  autoHideDelay: 2000,
  dragDelay: 200,
    sortOrder: "alphabetical",

  useOnlyCustomDragDrop: false,
  dragDropColor: "#7F50E0", // Default purple color
  hoverColor: "#E0E0E0",    // Default light gray color
};

export class SettingTab extends PluginSettingTab {
  plugin: QuickArrange;

  constructor(app: App, plugin: QuickArrange) {
    super(app, plugin);
    this.plugin = plugin;
  }

  hide() {}

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName("Auto Collapse")
      .setDesc("Automatically hide ribbon and status bar items once your mouse leaves the icon container")
      .addToggle(toggle =>
        toggle.setValue(this.plugin.settings.autoHide).onChange(value => {
          this.plugin.settings.autoHide = value;
          this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Auto Collapse Delay")
      .setDesc("How long to wait before auto collapsing hidden icons on the ribbon and status bar")
      .addText(textfield => {
        textfield.setPlaceholder(String(2000));
        textfield.inputEl.type = "number";
        textfield.setValue(String(this.plugin.settings.autoHideDelay));
        textfield.onChange(async value => {
          this.plugin.settings.autoHideDelay = Number(value);
          this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Drag Start Delay (ms)")
      .setDesc("How long to wait before triggering the drag behavior after clicking. ⚠️ Requires an app restart.")
      .addText(textfield => {
        textfield.setPlaceholder(String(200));
        textfield.inputEl.type = "number";
        textfield.setValue(String(this.plugin.settings.dragDelay));
        textfield.onChange(async value => {
          this.plugin.settings.dragDelay = Number(value);
          this.plugin.saveSettings();
        });
      });



      new Setting(containerEl)
        .setName("Use Only Custom Drag and Drop")
        .setDesc("When enabled, only the plugin's smooth drag and drop will be used")
        .addToggle(toggle => toggle
            .setValue(this.plugin.settings.useOnlyCustomDragDrop)
            .onChange(async (value) => {
                this.plugin.settings.useOnlyCustomDragDrop = value;
                this.plugin.updateDragDropBehavior();
                await this.plugin.saveSettings();
        }));


      new Setting(containerEl)
        .setName("Drag & Drop Color")
        .setDesc("Set the color for dragged files and folders")
        .addColorPicker(color => color
            .setValue(this.plugin.settings.dragDropColor)
            .onChange(async (value) => {
                this.plugin.settings.dragDropColor = value;
                this.plugin.aestheticsManager.updateDragDropColor(value);
                await this.plugin.saveSettings();
                this.plugin.aestheticsManager.updateStyles();
            }));

    new Setting(containerEl)
        .setName("Hover Color")
        .setDesc("Set the color for hovering over files and folders")
        .addColorPicker(color => color
            .setValue(this.plugin.settings.hoverColor)
            .onChange(async (value) => {
                this.plugin.settings.hoverColor = value;
                this.plugin.aestheticsManager.updateHoverColor(value);
                await this.plugin.saveSettings();
                this.plugin.aestheticsManager.updateStyles();
            }));
  }
}
