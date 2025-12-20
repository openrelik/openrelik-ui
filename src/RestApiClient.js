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
import Investigation from "./views/Investigation.vue";

const RestApiClient = axios.create({
  baseURL: settings.apiServerUrl + "/api/" + settings.apiServerVersion + "/",
  withCredentials: true,
});

const RestApiBlobClient = axios.create({
  baseURL: settings.apiServerUrl + "/api/" + settings.apiServerVersion + "/",
  responseType: "blob",
  withCredentials: true,
});

function RestApiSSEClient(endpoint, requestBody) {
  const url =
    settings.apiServerUrl +
    "/api/" +
    settings.apiServerVersion +
    "/" +
    endpoint;

  return new Observable((observer) => {
    const controller = new AbortController();
    const decoder = new TextDecoder("utf-8");
    const csrfToken = sessionStorage.getItem("csrfToken");

    fetch(url, {
      method: "POST",
      headers: {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken || "",
      },
      credentials: "include",
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`SSE request failed: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        const read = () => {
          reader
            .read()
            .then(({ done, value }) => {
              if (done) {
                observer.complete();
                return;
              }

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk
                .split(/\r?\n/)
                .filter((line) => line.startsWith("data:"));
              lines.forEach((line) => {
                const data = line.replace(/^data:\s*/, "");
                observer.next(data);
              });

              read();
            })
            .catch((err) => observer.error(err));
        };

        read();
      })
      .catch((err) => observer.error(err));

    return () => controller.abort(); // allow external unsubscribe
  });
}

/**
 * Adds an interceptor to the provided Axios client that automatically refreshes
 * the access token when a 401 (Unauthorized) response is encountered.
 */
function addRefreshTokenInterceptor(client) {
  client.interceptors.response.use(
    (response) => {
      // If the response is successful (status code 2xx), return it as is.
      return response;
    },
    async (error) => {
      // If the response is an error, check if it's a 401 (Unauthorized) error.
      const originalRequest = error.config;
      // Only attempt to refresh the token if the request hasn't already been retried.
      if (error.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true; // Mark the request as retried to prevent infinite loops.
        try {
          // Make a request to the auth server to refresh the access token.
          const response = await axios.get(
            settings.apiServerUrl + "/auth/refresh",
            {
              withCredentials: true, // Include credentials (cookies) in the refresh request.
            }
          );

          // Update CSRF token in sessionStorage
          sessionStorage.setItem("csrfToken", response.data.new_csrf_token);

          // Retry the original request. The updated access token should be
          // automatically included in the request headers by the Axios client.
          return client(originalRequest);
        } catch (refreshError) {
          // If refreshing the token fails, redirect the user to the login page.
          // This could happen if the refresh token is invalid or expired.
          console.error("Refresh error, redirect");
          sessionStorage.removeItem("csrfToken");
          window.location.href = "/login?redirect=" + window.location.pathname;
        }
      }
      // If the error is not a 401 or the refresh failed, reject the promise and
      // let the calling code handle the error.
      return Promise.reject(error);
    }
  );
}

async function fetchCsrfToken() {
  const csrfTokenResponse = await axios.get(
    `${settings.apiServerUrl}/auth/csrf`,
    {
      withCredentials: true, // Include credentials for cross-origin requests
    }
  );

  // Store CSRF token in session storage and return.
  if (csrfTokenResponse.status === 200) {
    sessionStorage.setItem("csrfToken", csrfTokenResponse.data);
    return csrfTokenResponse.data;
  } else {
    throw new Error("Failed to fetch CSRF token");
  }
}

/**
 * Adds an interceptor to the provided Axios client that automatically refreshes
 * the CSRF token and adds it to the request headers. Token is stored in sessionStorage.
 */
function addCSRFInterceptor(client) {
  // Add X-CSRF-Token to all requests
  client.interceptors.request.use(
    async (config) => {
      // 1. Check if the request method is safe, and if so skip setting the CSRF header.
      const safeMethods = ["GET", "HEAD", "OPTIONS", "TRACE"];
      if (safeMethods.includes(config.method.toUpperCase())) {
        return config; // Skip adding CSRF token for safe methods
      }

      // 2. Attempt to retrieve the CSRF token from session storage. If it is missing
      // try to fetch it.
      let csrfToken = sessionStorage.getItem("csrfToken");
      if (!csrfToken) {
        csrfToken = await fetchCsrfToken();
      }

      // 3. If the token exists, add it to the request headers and proceed.
      if (csrfToken) {
        config.headers["X-CSRF-Token"] = csrfToken;
      }
      return config;
    },
    (error) => {
      // Handle general request errors.
      return Promise.reject(error);
    }
  );
}

// Add the interceptor to both clients
addRefreshTokenInterceptor(RestApiClient);
addRefreshTokenInterceptor(RestApiBlobClient);

// Add CSRF header X-CSRF-Token, fetching token from the server if it is missing
addCSRFInterceptor(RestApiClient);
addCSRFInterceptor(RestApiBlobClient);

export default {
  sse(url, requestBody) {
    return RestApiSSEClient(url, requestBody);
  },
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
      RestApiClient.get("/taskqueue/tasks/registered")
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
  async getSharedFolders() {
    return new Promise((resolve, reject) => {
      let url = "/folders/shared/";
      RestApiClient.get(url)
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async getAllFolders(searchTerm = null, page = null, itemsPerPage = null) {
    return new Promise((resolve, reject) => {
      let url = "/folders/all/";
      let params = {};
      if (searchTerm) {
        params["q"] = searchTerm;
      }
      if (page) {
        params["page"] = page;
      }
      if (itemsPerPage) {
        params["page_size"] = itemsPerPage;
      }
      RestApiClient.get(url, { params })
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
    let url = "/folders/";
    let requestBody = { display_name: name };
    if (parent_id) {
      url = url + parent_id + "/folders/";
      requestBody.parent_id = parent_id;
    }
    return new Promise((resolve, reject) => {
      RestApiClient.post(url, requestBody)
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

  async getWorkflow(folderId, workflowId) {
    return new Promise((resolve, reject) => {
      RestApiClient.get("/folders/" + folderId + "/workflows/" + workflowId)
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async generateWorkflowReport(workflowId) {
    return new Promise((resolve, reject) => {
      RestApiClient.get("/workflows/" + workflowId + "/report/")
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
      RestApiClient.post("/folders/" + folder_id + "/workflows/", requestBody)
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
      RestApiClient.patch(
        "/folders/" + workflow.folder.id + "/workflows/" + workflow.id,
        requestBody
      )
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async generateWorkflowName(workflow) {
    return new Promise((resolve, reject) => {
      RestApiClient.get(
        "/folders/" +
          workflow.folder.id +
          "/workflows/" +
          workflow.id +
          "/generate_name/"
      )
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
      RestApiClient.post(
        "/folders/" +
          workflow.folder.id +
          "/workflows/" +
          workflow.id +
          "/copy/"
      )
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async runWorkflow(workflow, workflowSpec) {
    const requestBody = {
      workflow_spec: workflowSpec,
    };
    return new Promise((resolve, reject) => {
      RestApiClient.post(
        "/folders/" +
          workflow.folder.id +
          "/workflows/" +
          workflow.id +
          "/run/",
        requestBody
      )
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
      RestApiClient.delete(
        "/folders/" + workflow.folder.id + "/workflows/" + workflow.id
      )
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
  async createWorkflowTemplate(displayName, workflowId) {
    const requestBody = {
      display_name: displayName,
      workflow_id: workflowId,
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
  async generateFileSummary(fileId) {
    return new Promise((resolve, reject) => {
      RestApiClient.post("/files/" + fileId + "/summaries")
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
  async getFileChat(fileId) {
    return new Promise((resolve, reject) => {
      RestApiClient.get("/files/" + fileId + "/chat")
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
  async deleteUserApiKey(apiKeyId) {
    return new Promise((resolve, reject) => {
      RestApiClient.delete(`/users/me/apikeys/${apiKeyId}`)
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async refreshCsrfToken() {
    let token = await fetchCsrfToken();
    return token;
  },
  async searchUsers(query) {
    const requestBody = {
      search_string: query,
    };
    return new Promise((resolve, reject) => {
      RestApiClient.post("/users/search", requestBody)
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async getAllGroups() {
    return new Promise((resolve, reject) => {
      RestApiClient.get("/groups/")
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async shareFolder(folder_id, groups, group_role, users, user_role) {
    const requestBody = {
      group_ids: groups.map((group) => group.id),
      group_role: group_role,
      user_ids: users.map((user) => user.id),
      user_role: user_role,
    };
    return new Promise((resolve, reject) => {
      RestApiClient.post("/folders/" + folder_id + "/roles", requestBody)
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async getMyFolderRole(folder_id) {
    return new Promise((resolve, reject) => {
      RestApiClient.get("/folders/" + folder_id + "/roles/me")
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async deleteUserRole(folder_id, user_role_id) {
    return new Promise((resolve, reject) => {
      RestApiClient.delete(
        "/folders/" + folder_id + "/roles/users/" + user_role_id
      )
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async deleteGroupRole(folder_id, group_role_id) {
    return new Promise((resolve, reject) => {
      RestApiClient.delete(
        "/folders/" + folder_id + "/roles/groups/" + group_role_id
      )
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async getTaskMetrics(metricName, aggregate, range, step, resolution) {
    const requestBody = {
      metric_name: metricName,
      aggregate: aggregate,
      range: range,
      step: step,
      resolution: resolution,
    };
    return new Promise((resolve, reject) => {
      RestApiClient.post("/metrics/tasks", requestBody)
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async getInvestigativeQuestions(folder_id, name, context) {
    return new Promise((resolve, reject) => {
      const requestBody = {
        goal: name,
        context: context,
      };
      RestApiClient.post(
        "/folders/" + folder_id + "/investigations/questions",
        requestBody
      )
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async getSQLSchemas(file_id) {
    return new Promise((resolve, reject) => {
      RestApiClient.get("/files/" + file_id + "/sql/schemas")
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async runSQLQuery(file_id, sqlQuery) {
    const requestBody = {
      query: sqlQuery,
    };
    return new Promise((resolve, reject) => {
      RestApiClient.post("/files/" + file_id + "/sql/query", requestBody)
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  async generateSQLQuery(file_id, userRequest) {
    const requestBody = {
      user_request: userRequest,
    };
    return new Promise((resolve, reject) => {
      RestApiClient.post(
        "/files/" + file_id + "/sql/query/generate",
        requestBody
      )
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
};
