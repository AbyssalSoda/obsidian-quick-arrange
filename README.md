<h1 align="center">
Obsidian Quick Arrange
</h1>

<p align="center">
A tool to clean up and enhance Obsidian Bartender, focusing on native drag-and-drop file exploration.
</p>

<p align="center">
 <a href="https://github.com/AbyssalSoda/obsidian-quick-arrange/releases"><img height="30px" src="https://img.shields.io/github/downloads/AbyssalSoda/obsidian-quick-arrange/total?color=brightgreen" alt="Downloads"></a>
 <a href="https://github.com/AbyssalSoda/obsidian-quick-arrange/releases"><img height="30px" src="https://img.shields.io/github/v/release/AbyssalSoda/obsidian-quick-arrange?color=brightgreen" alt="Current Release"></a>
 <a href="https://github.com/AbyssalSoda/obsidian-quick-arrange/issues"><img height="30px" src="https://img.shields.io/github/issues/AbyssalSoda/obsidian-quick-arrange?color=brightgreen" alt="Issues Badge"></a>
</p>

<p align="center">
  <a href="#installation">Installation</a> •
  <a href="#quick-arrange-functionality">Functionality</a> •
  <a href="#support">Support</a> •
  <a href="#faq">FAQ</a> •
  <a href="#links">Links</a>
</p>

<p align="center">
 <a href='https://ko-fi.com/I2I1TR6PC' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi1.png?v=3' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>
</p>

---

**Note:** This project is formerly forked and modified version of [nothingislost's Obsidian Bartender](https://github.com/nothingislost/obsidian-bartender) and incorporates aspects of other forked versions such as [zansbang's fork](https://github.com/zansbang/obsidian-bartender).

**⚠️ Caution:** This plugin is version specific and relies heavily on refreshing the file explorer. As such each release is version specific - please check which version of Obsidan corresponds to your version of Quick Arrange.

---


## Versions
`Obsidian 1.5.8` --> Release `v0.5.10`

`Obsidian 1.6.7` --> Release `v0.6.0`

`Obsidian 1.7.1` ---> **Once Its Published I'll begin working**

*For known bugs please check release notes*

## Installation

**Current Method:**
1. Install it using [BRAT](https://github.com/TfTHacker/obsidian42-brat).
2. Go to the **Community Plugins** tab in Obsidian settings and search for "BRAT".
3. Install the plugin, then copy-paste the repository link for Quick Arrange in the `Add Beta plugin` section within the BRAT plugin settings.
4. ⚠️ Remember to restart Obsidian to apply the plugin

**Manual Method:**
1. Copy `main.js`, `styles.css`, and `manifest.json` into a folder inside your Obsidian vault's plugin folder (`VaultFolder/.obsidian/plugins/obsidian-quick-arrange/...`).


## Quick Arrange Functionality

**Current Functionality:**
- Allows users to drag and drop files between folders when sorting.
- Allows users to drag and drop folders and their contents when sorting to other folders.
- Allows users to customize drag & drop - as well as hover colors
- Allows dual functionality between Obsidian and Quick Arrange drag and drop
- All other native Bartender functionality.

#### Planned Removal:
- Filters will be removed to allow focus on another plugin I might create called "Conditional Logic".


## Former Bartender Functionality

The original README states that you can "organize, rearrange, and filter nav bars, ribbon bars, status bars, and the file explorer."

- Reorder folders/files in the file explorer (independently of one another only).
- Use filters when searching through folders/files.
- Rearrange elements in the status bar.
- Organize elements in the status bar and ribbon bar into an auto-collapsible separator.

### File Explorer Filtering (Soon to be deprecated)
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



## Support

- **Like what I do?** Check out my other creative endeavors [here](https://abyssalsoda.carrd.co/).
- You can support the development of this plugin through donations:
  - **Zelle:** 
  - **Ko-fi:** [![Support Me on Ko-fi](https://img.shields.io/badge/Support%20Me%20on%20Ko--fi-blue)](https://ko-fi.com/AbyssalSoda)

---

## FAQ

<details> 
<summary> How does this differ from Obsidian Bartender? </summary>
Users are able to move folders along with files interchangably & it works with the latest version of obsidian as of Obsidian v1. 6.7.
</details>

<details> 
<summary> What current versions of obsidian are supported? </summary>
1.5.8 to 1.6.7 at the moment
</details>


## Links

- [GitHub Repository](https://github.com/AbyssalSoda/obsidian-quick-arrange)
- [Releases](https://github.com/AbyssalSoda/obsidian-quick-arrange/releases)
- [Author's GitHub](https://github.com/AbyssalSoda)



