<template>
  <div
    class="workflow-report"
    :class="{ 'light-theme': isLightTheme, 'dark-theme': !isLightTheme }"
  >
    <div v-if="reportHtml" class="report-content" v-html="reportHtml"></div>
    <div v-else class="text-center pa-4 text-muted">No report available.</div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { useThemeInfo } from "@/composables/useThemeInfo";

const { isLightTheme } = useThemeInfo();

const props = defineProps({
  markdown: {
    type: Object,
    default: "",
  },
});

const reportHtml = computed(() => {
  if (!props.markdown) {
    return "";
  }
  return DOMPurify.sanitize(
    marked(props.markdown.markdown, { FORBID_TAGS: ["hr"] })
  );
});
</script>

<style scoped>
.workflow-report {
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --code-bg: #f1f5f9;
  --border-color: #e2e8f0;
}

.workflow-report.dark-theme {
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --code-bg: #1e293b;
  --border-color: rgba(255, 255, 255, 0.1);
}

.report-content {
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--text-primary);
}

.report-content :deep(h1),
.report-content :deep(h2),
.report-content :deep(h3) {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.report-content :deep(h1) {
  font-size: 1.5rem;
}
.report-content :deep(h2) {
  font-size: 1.25rem;
}
.report-content :deep(h3) {
  font-size: 1.1rem;
}

.report-content :deep(p) {
  margin-bottom: 16px;
}

.report-content :deep(ul),
.report-content :deep(ol) {
  margin-bottom: 16px;
  padding-left: 24px;
}

.report-content :deep(li) {
  margin-bottom: 4px;
}

.report-content :deep(code) {
  background-color: var(--code-bg);
  padding: 2px 4px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.85em;
}

.report-content :deep(pre) {
  background-color: var(--code-bg);
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin-bottom: 16px;
  border: 1px solid var(--border-color);
}

.report-content :deep(pre code) {
  padding: 0;
  background-color: transparent;
}

.report-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;
}

.report-content :deep(th),
.report-content :deep(td) {
  border: 1px solid var(--border-color);
  padding: 8px 12px;
  text-align: left;
}

.report-content :deep(th) {
  background-color: var(--code-bg);
  font-weight: 600;
}

.text-muted {
  color: var(--text-secondary);
  font-style: italic;
}
</style>
