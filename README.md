# Obsidian Quick Arrange (Early Development)

**Like what I do?** Check out my other creative endeavors here: https://abyssalsoda.carrd.co/

This project aims to clean up and provide up-to-date support for Obsidian Bartender by cutting back on features and improving upon native functionality one might expect out of typical drag and drop file exploring.

**Note:** This project is forked/modified version of [nothingislost's Obsidian Bartender](https://github.com/nothingislost/obsidian-bartender) and incorporates aspects of other forked versions such as [zansbang's fork](https://github.com/zansbang/obsidian-QArrange).

## Installation

**Current Method:**
- Install it using [BRAT](https://github.com/TfTHacker/obsidian42-brat)
  > Go to the Community Plugins tab in Obsidian settings and search for "BRAT" - install the plugin, then copy-paste the repository link for Quick Arrange in the `Add Beta plugin` section within the BRAT plugin settings.

**Manual Method:** 

Copy `main.js`, `styles.css`, and `manifest.json` into a folder inside your Obsidian vault's plugin folder (`VaultFolder/.obsidian/plugins/obsidian-quick-arrange/...`).

## Quick Arrange Functionality

**Current Functionality**
- Allow users to drag and drop files between folders when sorting
- Allow users to drag and drop folders and their contents when sorting to other folders
- All other native Bartender functionality

**Planned Removal:** 
- Filters will be removed to allow focus on another plugin I might create called "Conditional Logic"


## Former Bartender Functionality

The original README says that you can "organize, rearrange, and filter nav bars, ribbon bars, status bars, and the file explorer."

- Reorder folders/files in the file explorer (Idependently of one another only)
- Use filters when searching through folders/files.
- Rearrange elements in the status bar.
- Organize elements in the status bar and ribbon bar into an auto-collapsible separator.

### File Explorer Filtering (Soon to be depriciated)

The file explorer can be filtered using Fuse.js's extended search syntax:

White space acts as an **AND** operator. To escape white space, use double quotes (e.g., `="scheme language"`) for exact match. A single pipe (`|`) character acts as an **OR** operator. 

| Token       | Match Type                 | Description                            |
| ----------- | -------------------------- | -------------------------------------- |
| `jscript`   | fuzzy-match                | items that fuzzy match `jscript`       |
| `=scheme`   | exact-match                | items that are `scheme`                |
| `'python`   | include-match              | items that include `python`            |
| `!ruby`     | inverse-exact-match        | items that do not include `ruby`       |
| `^java`     | prefix-exact-match         | items that start with `java`           |
| `!^erlang`  | inverse-prefix-exact-match | items that do not start with `erlang`  |
| `.js$`      | suffix-exact-match         | items that end with `.js`              |
| `!.go$`     | inverse-suffix-exact-match | items that do not end with `.go`       |



