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
    }
  },
  actions: {
    async createSession(folderId) {
      const response = await RestApiClient.createAgentSession(folderId);
      this.sessionId = response.session_id;
      this.getSessionData(folderId);
    },
    getSessionData(folderId) {
      if (this.isListening) return;
      this.isListening = true;
      RestApiClient.sse(
        "folders/" + folderId + "/investigations/" + this.sessionId
      ).subscribe({
        next: (data) => {
          data = JSON.parse(data);
          this.sessionData = data["state"];
        },
        error: (err) => {
          console.error(err);
          this.isListening = false;
        },
      });
    },
    async runAgent(folderId) {
      const requestBody = {
        session_id: this.sessionId,
        agent_name: "dfir_multi_agent",
      };
      
      this.isLoading = true;
      this.getSessionData(folderId);

      RestApiClient.sse(
        "folders/" + folderId + "/investigations/run",
        requestBody
      ).subscribe({
        next: (data) => {
          this.isLoading = true;
          this.chatMessages.push(JSON.parse(data));
        },
        error: (err) => {
          console.error(err);
          this.isLoading = false;
        },
        complete: () => {
          this.isLoading = false;
          console.log("done");
        },
      });
    },
  },
});
