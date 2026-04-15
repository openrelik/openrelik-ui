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
- The mount point field displays a hint clarifying that the value must match the container path defined in `docker-compose.yml`.
- After creating or updating a storage, the UI probes it via the browse endpoint and shows a success message if accessible, or a warning if the mount point cannot be reached (e.g. missing volume mount or container not restarted).

**`AddExternalFileDialog.vue`**

A file browser dialog for navigating a selected external storage and registering individual files into the current folder. Opened from the folder view. Allows users to:

- Select an external storage backend from those configured in `ExternalStorageManager`.
- Browse the directory tree interactively — the storage root loads automatically on selection; directories and files are shown with icons.
- Breadcrumb navigation within the storage; the storage name is shown as the root segment (e.g. `case_storage → evidence`).
- Click a file to select it, then confirm to register it as an external reference in the folder.

**`MountExternalStorageDialog.vue`**

A dialog for mounting an external storage directly to a folder, so that all files under a given path within that storage are automatically synced into the folder's file list. Opened from the folder toolbar. Allows users to:

- Select an external storage backend from the configured list.
- Optionally specify a base path within the storage to use as the root (defaults to the storage root).
- On confirmation, the folder is updated via `PATCH /api/v1/folders/{id}` and the file list refreshes immediately.

### Modified Components

**`SystemMenu.vue`**

Added an "External storages" menu item that opens the `ExternalStorageManager` dialog.

**`Folder.vue`**

- Added an "Add from external storage" button that opens `AddExternalFileDialog` for registering individual files.
- Added a "Mount external storage" button that opens `MountExternalStorageDialog` for folder-level mounts.
- When a folder has an external storage mounted, a chip displaying the storage name appears next to the folder title. The chip has an × button that unmounts the storage (`PATCH` with `null` values) and refreshes the file list.
- Files auto-synced from a mounted storage that reside in subdirectories are grouped into virtual folders in the file list. Clicking a virtual folder navigates into it, showing only the files at that level. A breadcrumb strip above the list displays the current virtual path with the storage name as root (e.g. `case_storage → evidence`); each segment is clickable for direct navigation. The virtual path resets when navigating to a different real folder.

**`FolderList.vue`**

- External files are visually distinguished with an "external" badge. Edit and delete actions are disabled for external file entries.
- Virtual external folders (synthetic entries representing subdirectories within a mounted storage) are rendered with a network folder icon (`mdi-folder-network-outline`) and emit navigation events instead of routing to a real folder URL.
- The ".." entry navigates up within the virtual path when inside a virtual external subdirectory, rather than routing to the parent real folder.
- Virtual folders show "—" in the Last modified column instead of an invalid date.

**`File.vue`**

The Details tab for external files includes a storage metadata section showing the originating storage name, type, and path. The "Create workflow" action is disabled for external files, as they are read-only references and cannot be used as workflow inputs.
