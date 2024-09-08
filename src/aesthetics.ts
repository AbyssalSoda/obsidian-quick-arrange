import { App } from "obsidian";
import { QArrangeSettings } from "./settings/settings";

export class AestheticsManager {
    private app: App;
    private settings: QArrangeSettings;
    private styleEl: HTMLStyleElement;

    constructor(app: App, settings: QArrangeSettings) {
        this.app = app;
        this.settings = settings;
        this.styleEl = document.head.createEl("style");
        this.updateStyles();
    }

    updateStyles() {
        const css = this.generateCSS();
        this.styleEl.textContent = css;
    }

    private generateCSS(): string {
        return `
            .nav-file.sortable-drag,
            .nav-folder.sortable-drag,
            .nav-file.sortable-chosen,
            .nav-folder.sortable-chosen {
                background-color: ${this.settings.dragDropColor} !important;
                color: var(--text-on-accent) !important;
                opacity: 1 !important;
                border-radius: 4px;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2) !important;
            }

            .nav-file-title:hover,
            .nav-folder-title:hover {
                background-color: ${this.settings.hoverColor} !important;
            }

            .nav-file-title,
            .nav-folder-title {
                transition: background-color 0.1s ease-out;
            }

            body.is-dragging .nav-file-title:hover,
            body.is-dragging .nav-folder-title:hover {
                background-color: inherit !important;
            }
        `;
    }

    updateDragDropColor(color: string) {
        this.settings.dragDropColor = color;
        this.updateStyles();
    }

    updateHoverColor(color: string) {
        this.settings.hoverColor = color;
        this.updateStyles();
    }
}