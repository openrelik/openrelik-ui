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

// Utilities
import { defineStore } from "pinia";
import RestApiClient from "@/RestApiClient";
import { Graph } from "@/utils/investigationGraphUtils";

export const useInvestigationStore = defineStore("investigation", {
  state: () => ({
    sessionId: null,
    chatMessages: [],
    isLoading: false,
    sessionData: {},
    isListening: false,
    pendingApproval: null,
  }),
  getters: {
    graph: (state) => {
      const data = state.sessionData || {};
      const graph = new Graph();
      
      // 1. Add Questions (Roots)
      (data.questions || []).forEach((q) => {
        graph.addNode(q.id, { ...q, type: "QUESTION", label: q.question });
      });

      // 2. Add Leads (Children of Questions)
      (data.leads || []).forEach((l) => {
        graph.addNode(l.id, { ...l, type: "SECTION", label: l.lead });
        if (l.question_id) {
          graph.addEdge(l.question_id, l.id);
        }
      });

      // 3. Add Hypotheses (Children of Leads or Questions)
      (data.hypotheses || []).forEach((h) => {
        graph.addNode(h.id, { ...h, type: "HYPOTHESIS", label: h.hypothesis });
        
        if (h.lead_id) {
          graph.addEdge(h.lead_id, h.id);
        } else if (h.question_id) {
          graph.addEdge(h.question_id, h.id);
        }
      });

      // 4. Add Tasks (Children of Hypotheses)
      (data.tasks || []).forEach((t) => {
        graph.addNode(t.id, { ...t, type: "TASK", label: t.task });
        if (t.hypothesis_id) {
          graph.addEdge(t.hypothesis_id, t.id);
        }
      });

      return graph;
    },
    tree: (state) => {
        // Return the forest (array of trees)
        // We can filter roots here if we only want questions at the top level, 
        // but the graph logic handles roots fairly well.
        return state.graph.toTree();
    },
    taskList: (state) => {
      const graph = state.graph; // Accessing other getter
      if (!graph) return [];

      const allNodes = Array.from(graph.nodes.values());
      const tasks = allNodes.filter((n) => n.type === "TASK");

      return tasks.map((task) => {
        // Traverse up to find context
        const parents = graph.getParents(task.id);
        const hypothesis = parents.find((p) => p.type === "HYPOTHESIS");
        
        let lead = null;
        let question = null;

        if (hypothesis) {
          const hypParents = graph.getParents(hypothesis.id);
          lead = hypParents.find((p) => p.type === "SECTION"); // Lead is SECTION
          
          // Question can be parent of Lead OR directly parent of Hypothesis (orphan)
          if (lead) {
            const leadParents = graph.getParents(lead.id);
            question = leadParents.find((p) => p.type === "QUESTION");
          } else {
            // Orphan hypothesis
            question = hypParents.find((p) => p.type === "QUESTION");
          }
        }

        return {
          ...task,
          hypothesis,
          lead,
          question,
        };
      });
    }
  },
  actions: {
    async createSession(folderId) {
      const storageKey = `openrelik_agent_session_${folderId}`;
      const existingSessionId = localStorage.getItem(storageKey);

      if (existingSessionId) {
        this.sessionId = existingSessionId;
      } else {
        const response = await RestApiClient.createAgentSession(folderId);
        this.sessionId = response.session_id;
        localStorage.setItem(storageKey, this.sessionId);
      }

      this.getSessionData(folderId);
    },
    async getSessionData(folderId) {
      if (this.isListening) return;
      this.isListening = true;
      RestApiClient.sse(
        "folders/" + folderId + "/investigations/" + this.sessionId
      ).subscribe({
        next: (data) => {
          data = JSON.parse(data);
          this.sessionData = data["state"];
          if (this.chatMessages.length === 0) {
            this.chatMessages = data["events"];
          }
        },
        error: (err) => {
          console.error(err);
          this.isListening = false;
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

      RestApiClient.sse(
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
                part.functionCall && part.functionCall.name === "ask_for_approval"
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
        error: (err) => {
          console.error(err);
          this.isLoading = false;
        },
        complete: () => {
          if (!this.pendingApproval) {
            this.isLoading = false;
          }
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
  },
});
