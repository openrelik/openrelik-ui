/*
Copyright 2024-2026 Google LLC

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

// Utilities
import { defineStore } from "pinia";
import RestApiClient from "@/RestApiClient";

export const useInvestigationStore = defineStore("investigation", {
  state: () => ({
    sessionId: null,
    chatMessages: [],
    isLoading: false,
    sessionData: {},
    isListening: false,
    pendingApproval: null,
    sseSubscription: null,
    runSubscription: null,
    sessionIsLoading: false,
  }),
  getters: {
    tree: (state) => {
      const data = state.sessionData || {};
      const questions = (data.questions || []).map((q) => ({
        ...q,
        type: "QUESTION",
        label: q.question,
        children: [],
      }));
      const leads = (data.leads || []).map((l) => ({
        ...l,
        type: "SECTION",
        label: l.lead,
        children: [],
      }));
      const hypotheses = (data.hypotheses || []).map((h) => ({
        ...h,
        type: "HYPOTHESIS",
        label: h.hypothesis,
        children: [],
      }));
      const tasks = (data.tasks || []).map((t) => ({
        ...t,
        type: "TASK",
        label: t.task,
        children: [],
      }));

      const nodeMap = new Map();
      [...questions, ...leads, ...hypotheses, ...tasks].forEach((n) =>
        nodeMap.set(n.id, n)
      );

      // Link Tasks to Hypotheses
      tasks.forEach((t) => {
        if (t.hypothesis_id && nodeMap.has(t.hypothesis_id)) {
          nodeMap.get(t.hypothesis_id).children.push(t);
        }
      });

      // Link Hypotheses to Leads or Questions
      hypotheses.forEach((h) => {
        if (h.lead_id && nodeMap.has(h.lead_id)) {
          nodeMap.get(h.lead_id).children.push(h);
        } else if (h.question_id && nodeMap.has(h.question_id)) {
          nodeMap.get(h.question_id).children.push(h);
        }
      });

      // Link Leads to Questions
      leads.forEach((l) => {
        if (l.question_id && nodeMap.has(l.question_id)) {
          nodeMap.get(l.question_id).children.push(l);
        }
      });

      return questions;
    },
    taskList: (state) => {
      const data = state.sessionData || {};
      const tasks = data.tasks || [];
      return tasks.map((t) => ({ ...t, label: t.task }));
    },
  },
  actions: {
    async createSession(folderId, context = null) {
      const storageKey = `openrelik_agent_session_${folderId}`;
      const existingSessionId = localStorage.getItem(storageKey);

      // If we have a session, attach to the existing session
      if (existingSessionId) {
        this.sessionId = existingSessionId;
        this.sessionIsLoading = true;
        this.runAgent(folderId, null);
      } else {
        const response = await RestApiClient.createAgentSession(
          folderId,
          context
        );
        this.sessionId = response.session_id;
        localStorage.setItem(storageKey, this.sessionId);
      }

      this.getSessionData(folderId);
    },
    async getSessionData(folderId) {
      if (this.isListening) return;
      this.isListening = true;
      this.sseSubscription = RestApiClient.sse(
        "folders/" + folderId + "/investigations/" + this.sessionId
      ).subscribe({
        next: (data) => {
          data = JSON.parse(data);
          this.sessionData = data["state"];
          if (data["state"]) {
            this.sessionIsLoading = false;
          }

          // If we are just fetching the initial state and no agent is running,
          // we can close the connection once we have the data (state).
          if (!this.runSubscription && data["state"]) {
            if (this.sseSubscription) {
              this.sseSubscription.unsubscribe();
              this.sseSubscription = null;
            }
            this.isListening = false;
          }

          if (this.chatMessages.length === 0) {
            this.chatMessages = data["events"] || [];

            if (this.chatMessages.length > 0) {
              const lastMessage =
                this.chatMessages[this.chatMessages.length - 1];
              if (lastMessage.content && lastMessage.content.parts) {
                const hasAskForApproval = lastMessage.content.parts.some(
                  (part) =>
                    part.functionResponse &&
                    part.functionResponse.name === "ask_for_approval"
                );

                if (hasAskForApproval) {
                  this.pendingApproval = {
                    invocationId: lastMessage.invocationId,
                  };
                }
              }
            }
          }
        },
        error: (err) => {
          console.error(err);
          this.isListening = false;
          this.sessionIsLoading = false;
        },
      });
    },
    async runAgent(
      folderId,
      userMessage,
      functionName = null,
      longRunningToolId = null,
      invocationId = null
    ) {
      const requestBody = {
        session_id: this.sessionId,
        agent_name: "dfir_multi_agent",
        user_message: userMessage,
      };

      if (this.runSubscription) {
        this.runSubscription.unsubscribe();
        this.runSubscription = null;
      }

      if (functionName) {
        requestBody["function_name"] = functionName;
      }

      if (longRunningToolId) {
        requestBody["long_running_tool_id"] = longRunningToolId;
      }

      if (invocationId) {
        requestBody["invocation_id"] = invocationId;
      }

      this.isLoading = true;

      // Start listening to session updates if not already
      this.getSessionData(folderId);

      this.runSubscription = RestApiClient.sse(
        "folders/" + folderId + "/investigations/run",
        requestBody
      ).subscribe({
        next: (data) => {
          this.isLoading = true;
          const parsedData = JSON.parse(data);
          this.chatMessages.push(parsedData);

          // Check for approval request
          if (parsedData.content && parsedData.content.parts) {
            const hasAskForApproval = parsedData.content.parts.some(
              (part) =>
                part.functionCall &&
                part.functionCall.name === "ask_for_approval"
            );

            if (
              hasAskForApproval &&
              parsedData.longRunningToolIds &&
              parsedData.longRunningToolIds.length > 0
            ) {
              this.pendingApproval = {
                toolId: parsedData.longRunningToolIds[0],
                invocationId: parsedData.invocationId,
              };
              this.isLoading = false;
            }
          }
        },
        error: () => {
          this.runSubscription.unsubscribe();
          this.runSubscription = null;
          this.isLoading = false;
        },
        complete: () => {
          this.runSubscription.unsubscribe();
          this.runSubscription = null;
          this.isLoading = false;
        },
      });
    },
    async approveAction(folderId) {
      if (!this.pendingApproval) return;

      const { toolId, invocationId } = this.pendingApproval;
      this.pendingApproval = null;
      await this.runAgent(
        folderId,
        "{status: APPROVED}",
        "ask_for_approval",
        toolId,
        invocationId
      );
    },
    async rejectAction(folderId, reason = "no reason") {
      if (!this.pendingApproval) return;

      const { toolId, invocationId } = this.pendingApproval;
      this.pendingApproval = null;
      await this.runAgent(
        folderId,
        `{status: REJECTED, reason: ${reason}}`,
        "ask_for_approval",
        toolId,
        invocationId
      );
    },
    reset() {
      if (this.sseSubscription) {
        this.sseSubscription.unsubscribe();
      }
      if (this.runSubscription) {
        this.runSubscription.unsubscribe();
      }
      this.$reset();
      this.sessionIsLoading = false;
    },
  },
});
