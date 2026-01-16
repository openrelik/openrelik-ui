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
  <div
    class="task-status-overview glass-popup"
    :class="{ 'light-theme': isLightTheme, 'dark-theme': !isLightTheme }"
    :style="style"
    @mousedown.stop
    @click.stop
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div class="header">
      <div class="title">{{ displayName }}</div>
      <div class="header-actions">
        <span
          class="runtime-badge"
          v-if="runtime !== null && runtime !== undefined"
          >{{ runtime.toFixed(2) }}s</span
        >
        <button class="close-btn" @click="$emit('close')">
          <v-icon size="small">mdi-close</v-icon>
        </button>
      </div>
    </div>

    <div ref="contentBody" class="content-body scroll-container">
      <!-- Error State -->
      <div v-if="errorException">
        <div class="section">
          <div class="label error-label">Error Exception</div>
          <div class="value error-text">{{ errorException }}</div>
        </div>
        <div class="section" v-if="errorTraceback">
          <div class="label error-label">Traceback</div>
          <div class="value code-block error-block">{{ errorTraceback }}</div>
        </div>
      </div>

      <!-- Normal State -->
      <div v-else>
        <!-- Command -->
        <div class="section" v-if="command">
          <div class="label">Command</div>
          <div class="value code-block">{{ command }}</div>
        </div>

        <!-- Metadata -->
        <div class="section" v-if="Object.keys(meta).length">
          <div class="label">Metadata</div>
          <div class="config-list">
            <div v-for="(value, key) in meta" :key="key" class="config-item">
              <div class="config-key">{{ key }}:</div>
              <div class="config-val">
                <span v-if="key === 'sketch'">
                  <a :href="value" target="_blank" class="file-link">{{
                    value
                  }}</a>
                </span>
                <span v-else>{{ value }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Configuration -->
        <div class="section" v-if="formattedConfig.length">
          <div class="label">Configuration</div>
          <div class="config-list">
            <div
              v-for="(item, index) in formattedConfig"
              :key="index"
              class="config-item"
            >
              <div class="config-key">{{ item.label }}:</div>
              <div class="config-val">{{ item.value }}</div>
            </div>
          </div>
        </div>

        <!-- File Reports -->
        <div class="section" v-if="fileReports && fileReports.length">
          <div class="label">File Reports ({{ fileReports.length }})</div>
          <div class="file-list">
            <div
              v-for="(report, index) in fileReports"
              :key="index"
              class="file-item report-item"
            >
              <v-icon
                size="small"
                class="file-icon"
                :style="report.priority >= 40 ? 'color: #ef4444;' : ''"
              >
                {{
                  report.priority >= 40
                    ? "mdi-alert-circle"
                    : "mdi-file-document-alert"
                }}
              </v-icon>
              <div class="file-info">
                <div class="file-name" :title="report.file.display_name">
                  <router-link
                    :to="{
                      name: 'file',
                      params: { folderId: folderId, fileId: report.file.id },
                    }"
                    class="file-link"
                  >
                    {{ report.file.display_name }}
                  </router-link>
                </div>
                <div
                  class="report-summary"
                  :class="{ 'high-priority': report.priority >= 40 }"
                >
                  {{ report.summary }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Task Report Section -->
        <div v-if="reportHtml" class="section">
          <div
            class="label"
            :class="{ 'error-label': reportPriority >= 40 }"
            style="display: flex; align-items: center"
          >
            <v-icon
              v-if="reportPriority >= 40"
              size="small"
              color="#ef4444"
              class="mr-1"
              >mdi-alert-circle</v-icon
            >
            Task Report
          </div>
          <div class="value report-content" v-html="reportHtml"></div>
        </div>

        <!-- Output Files -->
        <div class="section" v-if="outputFiles && outputFiles.length">
          <div class="label">Output Files ({{ outputFiles.length }})</div>
          <div class="file-list">
            <div v-for="file in outputFiles" :key="file.id" class="file-item">
              <v-icon size="small" class="file-icon">mdi-file-outline</v-icon>
              <div class="file-info">
                <div class="file-name" :title="file.display_name">
                  <router-link
                    :to="{
                      name: 'file',
                      params: { folderId: folderId, fileId: file.id },
                    }"
                    class="file-link"
                  >
                    {{ file.display_name }}
                  </router-link>
                </div>
                <div class="file-size">
                  {{ formatBytes(file.filesize) }}
                </div>
              </div>
              <v-btn
                icon="mdi-download"
                size="x-small"
                variant="text"
                class="download-btn"
                :href="getDownloadUrl(file.id)"
                target="_blank"
              ></v-btn>
            </div>
          </div>
        </div>
        <div class="section" v-else-if="status === 'SUCCESS'">
          <div class="label">Output Files</div>
          <div class="value text-muted">No output files generated.</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "WorkflowTaskResult",
};
</script>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from "vue";
import DOMPurify from "dompurify";
import { marked } from "marked";
import settings from "@/settings";
import { useThemeInfo } from "@/composables/useThemeInfo";

const { isLightTheme } = useThemeInfo();

const props = defineProps({
  data: {
    type: Object,
    required: true,
    default: () => ({}),
  },
  x: {
    type: Number,
    required: true,
  },
  y: {
    type: Number,
    required: true,
  },
  folderId: {
    type: [String, Number],
    required: true,
  },
});

const emit = defineEmits(["close"]);

const isMouseOver = ref(false);
const contentBody = ref(null);
const originalOverflow = ref("");

const handleWindowWheel = (e) => {
  if (!isMouseOver.value) {
    emit("close");
    return;
  }

  const content = contentBody.value;
  if (!content) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  const hasScrollableContent = content.scrollHeight > content.clientHeight;
  if (!hasScrollableContent) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  const isAtTop = content.scrollTop === 0;
  const isAtBottom =
    content.scrollTop + content.clientHeight >= content.scrollHeight;
  const isScrollingUp = e.deltaY < 0;
  const isScrollingDown = e.deltaY > 0;

  if ((isAtTop && isScrollingUp) || (isAtBottom && isScrollingDown)) {
    e.preventDefault();
    e.stopPropagation();
  }
};

const handleMouseEnter = () => {
  isMouseOver.value = true;
};

const handleMouseLeave = () => {
  isMouseOver.value = false;
};

onMounted(() => {
  originalOverflow.value = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  // passive: false allows preventDefault()
  window.addEventListener("wheel", handleWindowWheel, {
    capture: true,
    passive: false,
  });
});

onBeforeUnmount(() => {
  document.body.style.overflow = originalOverflow.value;
  window.removeEventListener("wheel", handleWindowWheel, {
    capture: true,
    passive: false,
  });
});

// Computed
const style = computed(() => {
  return {
    left: `${props.x}px`,
    top: `${props.y}px`,
  };
});

const taskResult = computed(() => {
  if (!props.data.result) return null;
  if (typeof props.data.result === "object") return props.data.result;
  try {
    return JSON.parse(props.data.result);
  } catch (e) {
    console.error("Failed to parse task result:", e);
    return null;
  }
});

const displayName = computed(() => props.data.display_name);

const command = computed(() => taskResult.value?.command);

const meta = computed(() => taskResult.value?.meta || {});

const errorException = computed(() => props.data.error_exception);

const errorTraceback = computed(() => props.data.error_traceback);

const runtime = computed(() => props.data.runtime);

const outputFiles = computed(() => props.data.output_files || []);

const fileReports = computed(() => {
  if (!props.data || !props.data.file_reports) return [];
  return props.data.file_reports;
});

const reportHtml = computed(() => {
  if (
    !props.data ||
    !props.data.task_report ||
    !props.data.task_report.markdown
  ) {
    return "";
  }
  return DOMPurify.sanitize(marked(props.data.task_report.markdown));
});

const reportPriority = computed(() => {
  if (!props.data || !props.data.task_report) return 0;
  return props.data.task_report.priority || 0;
});

const formattedConfig = computed(() => {
  if (
    !props.data ||
    !props.data.task_config ||
    !Array.isArray(props.data.task_config)
  )
    return [];
  return props.data.task_config
    .filter(
      (opt) =>
        opt.hasOwnProperty("value") &&
        opt.value !== null &&
        opt.value !== undefined &&
        opt.value !== ""
    )
    .map((opt) => ({
      label: opt.title || opt.name,
      value: opt.value,
    }));
});

const status = computed(() => props.data.status_short);

// Methods
const formatBytes = (bytes, decimals = 2) => {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const getDownloadUrl = (fileId) => {
  return `${settings.apiServerUrl}/api/v1/files/${fileId}/download_stream`;
};
</script>

<style scoped>
.task-status-overview {
  position: fixed;
  width: 500px;
  min-height: 500px;
  max-height: 500px;
  border-radius: 12px;
  z-index: 3000; /* Match WorkflowTaskSelector */
  display: flex;
  flex-direction: column;
  overflow: hidden;
  pointer-events: auto;
  cursor: default;
  color: var(--text-primary);
}

.glass-popup {
  background: var(--popup-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--popup-border);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Theme adaptation */
.task-status-overview.dark-theme {
  --popup-bg: #1e293b; /* Opaque as requested */
  --popup-border: rgba(255, 255, 255, 0.1);
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --code-bg: rgba(15, 23, 42, 0.5);
  --hover-bg: rgba(255, 255, 255, 0.05);
}

.task-status-overview.light-theme {
  --popup-bg: #ffffff; /* Opaque as requested */
  --popup-border: #e2e8f0;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --code-bg: #f1f5f9;
  --hover-bg: #f8fafc;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--popup-border);
}

.title {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.runtime-badge {
  font-size: 0.7rem;
  background: var(--code-bg);
  color: var(--text-secondary);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
  border: 1px solid var(--popup-border);
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.content-body {
  padding: 16px;
  overflow-y: auto;
  overscroll-behavior: contain;
  flex: 1;
}

/* Custom Scrollbar */
.scroll-container::-webkit-scrollbar {
  width: 6px;
}
.scroll-container::-webkit-scrollbar-track {
  background: transparent;
}
.scroll-container::-webkit-scrollbar-thumb {
  background: var(--text-secondary);
  border-radius: 3px;
  opacity: 0.5;
}

.section {
  margin-bottom: 16px;
}

.section:last-child {
  margin-bottom: 0;
}

.file-report-item:last-child {
  border-bottom: none;
}

.report-content {
  font-size: 0.85rem;
  line-height: 1.5;
  color: inherit;
  padding: 8px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  overflow-x: auto;
}

/* Markdown Styles within report-content */
.report-content :deep(h1),
.report-content :deep(h2),
.report-content :deep(h3) {
  margin-top: 12px;
  margin-bottom: 8px;
  font-size: 1rem;
  font-weight: 600;
}

.report-content :deep(p) {
  margin-bottom: 8px;
}

.report-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 10px 0;
  font-size: 0.8rem;
}

.report-content :deep(th),
.report-content :deep(td) {
  border: 1px solid rgba(128, 128, 128, 0.2);
  padding: 6px;
  text-align: left;
}

.report-content :deep(th) {
  background-color: rgba(128, 128, 128, 0.1);
  font-weight: 600;
}

.dark-theme .report-content {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

.dark-theme .report-content :deep(th) {
  background-color: rgba(255, 255, 255, 0.1);
}

.label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  margin-bottom: 6px;
  font-weight: 600;
}

.value {
  font-size: 0.85rem;
  color: var(--text-primary);
  line-height: 1.5;
}

.text-muted {
  color: var(--text-secondary);
  font-style: italic;
}

.code-block {
  background: var(--code-bg);
  padding: 8px;
  border-radius: 6px;
  font-family: monospace;
  font-size: 0.75rem;
  word-break: break-all;
  white-space: pre-wrap;
  max-height: 100px;
  overflow-y: auto;
  border: 1px solid var(--popup-border);
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: var(--code-bg);
  border-radius: 6px;
  border: 1px solid transparent;
  transition: border-color 0.2s;
}

.file-item:hover {
  border-color: var(--popup-border);
}

.file-icon {
  color: var(--text-secondary);
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 0.85rem;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.download-btn {
  color: var(--text-secondary);
}
.download-btn:hover {
  color: var(--text-primary);
}

.error-label {
  color: #ef4444;
}

.error-text {
  color: #f87171;
  font-weight: 500;
}

.error-block {
  border-color: rgba(239, 68, 68, 0.2);
  background: rgba(239, 68, 68, 0.05);
  color: #f87171;
  max-height: 300px;
}
.file-link {
  color: inherit;
  text-decoration: none;
  cursor: pointer;
}

.file-link:hover {
  text-decoration: underline;
  color: var(--text-primary);
}

.report-item {
  align-items: flex-start; /* Align icon to top for multi-line summary */
}

.report-summary {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 2px;
}

.report-summary.high-priority {
  color: #ef4444;
  font-weight: 500;
}

.config-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-item {
  display: flex;
  font-size: 0.85rem;
  background: var(--code-bg);
  padding: 8px;
  border-radius: 6px;
  border: 1px solid var(--popup-border);
}

.config-key {
  color: var(--text-secondary);
  margin-right: 8px;
  font-weight: 500;
  white-space: nowrap;
}

.config-val {
  color: var(--text-primary);
  word-break: break-word;
}
</style>
