/*
Copyright 2024 Google LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import axios from "axios";
import settings from "./settings.js";

const RestApiClient = axios.create({
  baseURL: settings.apiServerUrl + "/api/" + settings.apiServerVersion + "/",
  withCredentials: true,
});

const RestApiBlobClient = axios.create({
  baseURL: settings.apiServerUrl + "/api/" + settings.apiServerVersion + "/",
  responseType: "blob",
  withCredentials: true,
});

export default {
  async getUser() {
    return new Promise((resolve, reject) => {
      RestApiClient.get("/users/me/")
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async getSystemConfig() {
    return new Promise((resolve, reject) => {
      RestApiClient.get("/configs/system/")
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async getRegisteredCeleryTasks() {
    return new Promise((resolve, reject) => {
      RestApiClient.get("/workflows/registered_tasks/")
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async getFolder(folderId) {
    return new Promise((resolve, reject) => {
      RestApiClient.get("/folders/" + folderId)
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async getRootFolders() {
    return new Promise((resolve, reject) => {
      let url = "/folders/";
      RestApiClient.get(url)
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async getFolders(folderId) {
    return new Promise((resolve, reject) => {
      let url = "/folders/" + folderId + "/folders/";
      RestApiClient.get(url)
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async createFolder(name, parent_id) {
    let requestBody = { display_name: name };
    if (parent_id) {
      requestBody.parent_id = parent_id;
    }
    return new Promise((resolve, reject) => {
      RestApiClient.post("/folders/", requestBody)
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async updateFolder(folder, requestBody) {
    return new Promise((resolve, reject) => {
      RestApiClient.patch("/folders/" + folder.id, requestBody)
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async deleteFolder(folder) {
    return new Promise((resolve, reject) => {
      RestApiClient.delete("/folders/" + folder.id)
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async getFiles(folderId) {
    let url = "/folders/" + folderId + "/files/";
    return new Promise((resolve, reject) => {
      RestApiClient.get(url)
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async getFile(fileId) {
    return new Promise((resolve, reject) => {
      RestApiClient.get("/files/" + fileId)
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async getFileContent(fileId) {
    return new Promise((resolve, reject) => {
      RestApiClient.get("/files/" + fileId + "/content/")
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async createFile(file) {
    let formData = new FormData();
    formData.append("file", file[0]);
    formData.append("folder_id", null);

    let config = {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    };
    return new Promise((resolve, reject) => {
      RestApiClient.post("/files/", formData, config)
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async createFileProgress(formData, config) {
    return new Promise((resolve, reject) => {
      RestApiClient.post("/files/", formData, config)
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async deleteFile(file) {
    return new Promise((resolve, reject) => {
      RestApiClient.delete("/files/" + file.id)
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async downloadFileBlob(fileId) {
    return new Promise((resolve, reject) => {
      RestApiBlobClient.get("/files/" + fileId + "/download_stream", {
        responseType: "stream",
      })
        .then((response) => {
          resolve(response);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async getFolderWorkflows(folderId) {
    return new Promise((resolve, reject) => {
      RestApiClient.get("/folders/" + folderId + "/workflows")
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async getFileWorkflows(fileId) {
    return new Promise((resolve, reject) => {
      RestApiClient.get("/files/" + fileId + "/workflows")
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async getWorkflow(workflowId) {
    return new Promise((resolve, reject) => {
      RestApiClient.get("/workflows/" + workflowId)
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async createWorkflow(file_ids, folder_id, templateId = null) {
    const requestBody = {
      file_ids: file_ids,
      folder_id,
      template_id: templateId,
    };
    return new Promise((resolve, reject) => {
      RestApiClient.post("/workflows/", requestBody)
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async updateWorkflow(workflow, requestBody) {
    return new Promise((resolve, reject) => {
      RestApiClient.patch("/workflows/" + workflow.id, requestBody)
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },

  async copyWorkflow(workflow) {
    return new Promise((resolve, reject) => {
      RestApiClient.post("/workflows/" + workflow.id + "/copy/")
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async getWorkflowTasks(fileId, workflowId) {
    return new Promise((resolve, reject) => {
      RestApiClient.get(
        "/files/" + fileId + "/workflows/" + workflowId + "/tasks/"
      )
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async runWorkflow(workflowId, workflowSpec) {
    const requestBody = {
      workflow_id: workflowId,
      workflow_spec: workflowSpec,
    };
    return new Promise((resolve, reject) => {
      RestApiClient.post("/workflows/run/", requestBody)
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async deleteWorkflow(workflow) {
    return new Promise((resolve, reject) => {
      RestApiClient.delete("/workflows/" + workflow.id)
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async getWorkflowTemplates() {
    return new Promise((resolve, reject) => {
      RestApiClient.get("/workflows/templates/")
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async createWorkflowTemplate(displayName, workflow) {
    const requestBody = {
      display_name: displayName,
      workflow: workflow,
    };
    return new Promise((resolve, reject) => {
      RestApiClient.post("/workflows/templates/", requestBody)
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async getFileSummary(fileId, summaryId) {
    return new Promise((resolve, reject) => {
      RestApiClient.get("/files/" + fileId + "/summaries/" + summaryId)
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async generateFileSummary(fileId) {
    return new Promise((resolve, reject) => {
      RestApiClient.post("/files/" + fileId + "/summaries/")
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async getUserApiKeys() {
    return new Promise((resolve, reject) => {
      RestApiClient.get("/users/me/apikeys/")
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async createUserApiKey(displayName, expireMinutes) {
    const requestBody = {
      display_name: displayName,
      expire_minutes: expireMinutes,
    };
    return new Promise((resolve, reject) => {
      RestApiClient.post("/users/me/apikeys/", requestBody)
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
};
