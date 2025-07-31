<!--
Copyright 2025 Google LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->
<template>
  <div v-if="folder">
    <!-- Dialog for creating a new investigation -->
    <v-dialog v-model="newInvestigationDialog" persistent>
      <v-card width="600" class="mx-auto">
        <v-card-title>New Investigation</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="createInvestigation">
            <v-text-field
              v-model="investigation.display_name"
              label="What is the goal of this investigation?"
              placeholder="Enter investigation goal"
              variant="outlined"
              required
              autofocus
            ></v-text-field>
            <v-textarea
              v-model="investigation.context"
              label="Context and background information for the investigation"
              placeholder="Enter context for the investigation"
              variant="outlined"
              required
            ></v-textarea>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-btn
            @click="createInvestigation()"
            color="primary"
            class="text-none"
          >
            Create
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog for creating a new question -->
    <v-dialog v-model="newQuestionDialog">
      <v-card width="600" class="mx-auto">
        <v-card-title>New Question</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="createQuestion">
            <v-text-field
              v-model="newQuestionForm.question"
              label="Question Text"
              placeholder="Enter question text"
              variant="outlined"
              required
              autofocus
              @keydown.enter="createQuestion"
            ></v-text-field>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-btn @click="createQuestion()" color="primary" class="text-none">
            Create
          </v-btn>
          <v-btn @click="newQuestionDialog = false" class="text-none"
            >Cancel</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Breadcrumbs for navigation -->
    <v-breadcrumbs density="compact" class="ml-n4 mt-n1">
      <small>
        <v-breadcrumbs-item :to="{ name: 'home' }"> Home </v-breadcrumbs-item>
        <v-breadcrumbs-divider
          v-if="folder && folder.parent"
        ></v-breadcrumbs-divider>
        <breadcrumbs :folder="folder.parent"></breadcrumbs>
        <v-breadcrumbs-divider></v-breadcrumbs-divider>

        <v-breadcrumbs-item
          :to="{
            name: 'folder',
            params: { folderId: folder.id },
          }"
        >
          {{ folder.display_name }}
        </v-breadcrumbs-item>
        <v-breadcrumbs-divider></v-breadcrumbs-divider>
        <v-breadcrumbs-item>
          <span style="opacity: 0.5">Investigation</span>
        </v-breadcrumbs-item>
      </small>
    </v-breadcrumbs>

    <h3 v-if="investigation.ready">{{ investigation.display_name }}</h3>

    <v-row class="mt-1">
      <v-col cols="4">
        <v-card
          variant="outlined"
          rounded="lg"
          class="custom-border-color"
          :style="{ height: `calc(100vh - ${headerHeight}px)` }"
        >
          <v-toolbar color="transparent" density="compact">
            <v-toolbar-title style="font-size: 18px">
              Questions
            </v-toolbar-title>
          </v-toolbar>
          <v-divider></v-divider>

          <div class="pa-4">
            <v-btn
              class="text-none custom-border-color"
              variant="outlined"
              prepend-icon="mdi-plus"
              rounded
              block
              :disabled="questionsLoading"
              @click="newQuestionDialog = true"
              >Add question</v-btn
            >
          </div>
          <v-divider></v-divider>

          <v-skeleton-loader
            v-if="questionsLoading"
            type="list-item-three-line"
          />

          <template
            v-for="(question, index) in investigation.questions"
            :key="index"
          >
            <div
              class="pa-4 question-item"
              :class="{ 'question-selected': selectedQuestionIndex === index }"
              @click="selectQuestion(index)"
            >
              {{ question }}
            </div>
            <v-divider></v-divider>
          </template>
        </v-card>
      </v-col>
      <v-col cols="8">
        <v-card
          variant="outlined"
          rounded="lg"
          class="custom-border-color d-flex flex-column"
          :style="{ height: `calc(100vh - ${headerHeight}px)` }"
        >
          <v-toolbar color="transparent" density="compact">
            <v-toolbar-title style="font-size: 18px"> Agents </v-toolbar-title>
          </v-toolbar>
          <v-divider></v-divider>

          <!-- Display selected question or prompt to select one -->
          <div v-if="selectedQuestionIndex === null" class="pa-8 text-center">
            <v-icon size="64" color="grey-lighten-2"
              >mdi-help-circle-outline</v-icon
            >
            <h3 class="text-grey-lighten-1 mt-4">
              Select a question to investigate
            </h3>
          </div>

          <div v-else class="agent-container flex-grow-1">
            <AgentStream
              v-for="(question, index) in investigation.questions"
              :key="index"
              v-show="selectedQuestionIndex === index"
              :ref="`agent-${index}`"
              :folder-id="folderId"
              :prompt="question"
            />
          </div>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import RestApiClient from "@/RestApiClient";
import Breadcrumbs from "@/components/Breadcrumbs.vue";
import AgentStream from "@/components/AgentStream.vue";

export default {
  props: {
    folderId: {
      type: String,
      required: true,
    },
  },
  components: {
    Breadcrumbs,
    AgentStream,
  },
  data() {
    return {
      folder: null,
      newInvestigationDialog: true,
      newQuestionDialog: false,
      selectedQuestionIndex: null,
      questionsLoading: false,
      investigation: {
        display_name: "",
        context: "",
        questions: [],
        ready: false,
      },
      newQuestionForm: {
        question: "",
      },
      questionStates: {},
    };
  },
  computed: {
    headerHeight() {
      return 180;
    },
  },
  methods: {
    getFolder() {
      RestApiClient.getFolder(this.folderId).then((response) => {
        this.folder = response;
      });
    },
    createInvestigation() {
      this.newInvestigationDialog = false;
      this.questionsLoading = true;
      this.investigation.ready = true;
      this.getInvestigativeQuestions();
    },
    createQuestion() {
      if (this.newQuestionForm.question.trim() === "") {
        return;
      }
      this.investigation.questions.push(this.newQuestionForm.question);
      this.newQuestionDialog = false;
      this.newQuestionForm.question = "";
    },
    selectQuestion(index) {
      this.selectedQuestionIndex = index;
      // Initialize question state if it doesn't exist
      if (!this.questionStates[index]) {
        this.questionStates[index] = {
          agentStarted: false,
        };
        this.$nextTick(() => {
          this.startAgentForQuestion(index);
        });
      }
    },
    startAgentForQuestion(index) {
      // Get the agent component for this question
      const agentComponent = this.$refs[`agent-${index}`];
      if (agentComponent && agentComponent[0]) {
        // Call the runAgent method on the component
        agentComponent[0].runAgent();
        this.questionStates[index].agentStarted = true;
      }
    },
    getInvestigativeQuestions() {
      RestApiClient.getInvestigativeQuestions(
        this.folderId,
        this.investigation.display_name,
        this.investigation.context
      )
        .then((response) => {
          this.investigation.questions = response;
        })
        .then(() => {
          this.questionsLoading = false;
        });
    },
  },
  mounted() {
    this.getFolder();
  },
};
</script>

<style scoped>
.question-item {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.question-item:hover:not(.question-selected) {
  background-color: rgba(0, 0, 0, 0.05);
}

.question-selected {
  background-color: #2196f3;
  color: white;
}

.agent-container {
  overflow: hidden; /* Let AgentStream handle its own scrolling */
}
</style>
