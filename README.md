# Obsidian Bartender

This is a fork of [zansbang's fork](https://github.com/zansbang/obsidian-bartender)
of [nothingislost's Obsidian Bartender](https://github.com/nothingislost/obsidian-bartender).

Zansbang's fork incorporates PRs [53](https://github.com/nothingislost/obsidian-bartender/pull/53)/[56](https://github.com/nothingislost/obsidian-bartender/pull/56)
to fix Bartender in Obsidian 1.5.3+.

This fork simply publishes releases containing `styles.css` to allow proper installation using BRAT.

## Functionality

The original README says that you can "organize, rearrange, and filter nav bars, ribbon bars, status bars, and the file explorer."

From what I've observed, you can:

- Reorder folders/files in the file explorer. (Finally.)
- Use more advanced filters when searching through folders/files.
- Rearrange elements in the status bar.
- Organize elements in the status bar and ribbon bar into an auto-collapsible separator.

### File Explorer Filtering

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

## Installation

### Using BRAT

This is the recommended method as you'll receive automatic updates.

1. Install the BRAT plugin
    - Open `Settings` -> `Community plugins`
    - Click `Browse`, and search for "BRAT"
    - Install the latest version of BRAT
2. Install the Bartender plugin
    - Open `Settings` -> `BRAT`
    - In the `Beta Plugin List` section, click `Add Beta plugin`
    - Specify this repository: `TehBrian/obsidian-bartender`
3. Enable the Bartender plugin
    - Open `Settings` -> `Community plugins`
    - In the `Installed plugins` section, enable the checkbox next to Bartender
    - Restart Obsidian

### Manually

Copy `main.js`, `styles.css`, and `manifest.json` into a folder inside your Obsidian vault's plugin folder (`VaultFolder/.obsidian/plugins/obsidian-bartender/...`).
