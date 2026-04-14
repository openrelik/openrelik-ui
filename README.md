# Digital Forensics Workflow UI

##### Obligatory Fine Print
This is not an official Google product (experimental or otherwise), it is just code that happens to be owned by Google.

---

## External Read-Only Data Stores

### Overview

The UI supports registering files from external read-only storage locations directly into folders without copying the underlying data. Administrators configure named storage backends (e.g. network shares, object stores) once; users can then browse those locations and register individual files into any folder. Registered external files are treated as read-only references: their metadata is stored in OpenRelik, but the bytes remain in place on the external storage.

### New Components

**`ExternalStorageManager.vue`**

A settings dialog for managing external storage configurations. Accessible from the system menu. Provides full CRUD operations:

- Lists all configured external storages with their name, type, and base path.
- Create a new storage configuration (name, type, connection details).
- Edit an existing configuration inline.
- Delete a configuration (with confirmation).

**`AddExternalFileDialog.vue`**

A file browser dialog for navigating a selected external storage and registering files into the current folder. Opened from the folder view. Allows users to:

- Select an external storage backend from those configured in `ExternalStorageManager`.
- Browse the directory tree of that storage.
- Select one or more files to register; on confirmation the files are added to the folder as external references.

### Modified Components

**`SystemMenu.vue`**

Added an "External storages" menu item that opens the `ExternalStorageManager` dialog.

**`Folder.vue`**

Added an "Add from external storage" button in the folder toolbar that opens the `AddExternalFileDialog`.

**`FolderList.vue`**

External files are visually distinguished with an "external" badge. Edit and delete actions are disabled for external file entries, since the source data is not managed by OpenRelik.

**`File.vue`**

The Details tab for external files includes a storage metadata section showing the originating storage name, type, and path. The "Create workflow" action is disabled for external files, as they are read-only references and cannot be used as workflow inputs.
