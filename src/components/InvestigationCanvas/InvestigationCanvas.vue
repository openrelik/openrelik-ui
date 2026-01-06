<template>
  <div
    ref="containerRef"
    class="investigation-workspace fill-height d-flex"
    :class="{ 'is-resizing': isAnyResizing }"
  >
    <!-- Far Left Pane: Investigation Tree -->
    <div
      v-if="showTree"
      class="pane tree-pane"
      :style="{ width: `${treePaneWidth}px` }"
    >
      <InvestigationTree
        :active-hypothesis-id="activeHypothesisId"
        @select-node="handleNodeSelection"
      />
    </div>

    <!-- Tree Resizer (Left) -->
    <div
      v-if="showTree"
      class="resizer"
      :class="{
        'light-theme-resizer': isLightTheme,
        'is-active': resizingTarget === 'tree',
      }"
      @mousedown="startResize('tree')"
      @mouseenter="hoveredResizer = 'tree'"
      @mouseleave="hoveredResizer = null"
      @mousemove="updateHandlePosition"
    >
      <div class="resizer-line"></div>
      <div
        v-show="hoveredResizer === 'tree' || resizingTarget === 'tree'"
        class="resizer-handle"
        :style="{ top: `${handleTop}px` }"
      ></div>
    </div>

    <!-- Middle Pane: Content (Flexible) -->
    <div class="pane middle-pane flex-grow-1">
      <InvestigationContent ref="contentRef" />
    </div>

    <!-- Right Resizer -->
    <div
      class="resizer"
      :class="{
        'light-theme-resizer': isLightTheme,
        'is-active': resizingTarget === 'chat',
      }"
      @mousedown="startResize('chat')"
      @mouseenter="hoveredResizer = 'chat'"
      @mouseleave="hoveredResizer = null"
      @mousemove="updateHandlePosition"
    >
      <div class="resizer-line"></div>
      <div
        v-show="hoveredResizer === 'chat' || resizingTarget === 'chat'"
        class="resizer-handle"
        :style="{ top: `${handleTop}px` }"
      ></div>
    </div>

    <!-- Right Pane: Chat -->
    <div class="pane right-pane" :style="{ width: `${chatPaneWidth}px` }">
      <InvestigationChat />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useThemeInfo } from "@/composables/useThemeInfo";
import InvestigationContent from "./InvestigationContent.vue";
import InvestigationChat from "./InvestigationChat.vue";
import InvestigationTree from "./InvestigationTree.vue";

const { isLightTheme } = useThemeInfo();
const containerRef = ref(null);
const contentRef = ref(null);
const showTree = ref(true);
const treePaneWidth = ref(280);
const chatPaneWidth = ref(400);
const resizingTarget = ref(null); // 'tree' | 'chat' | null
const hoveredResizer = ref(null); // 'tree' | 'chat' | null
const handleTop = ref(0);
const activeHypothesisId = ref(null);

const isAnyResizing = computed(() => !!resizingTarget.value);

const updateHandlePosition = (e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  handleTop.value = e.clientY - rect.top;
};

const startResize = (target) => {
  resizingTarget.value = target;
  document.addEventListener("mousemove", handleResize);
  document.addEventListener("mouseup", stopResize);
  document.body.style.userSelect = "none";
  document.body.style.cursor = "col-resize";
};

const handleResize = (e) => {
  if (!resizingTarget.value || !containerRef.value) return;
  const containerRect = containerRef.value.getBoundingClientRect();

  if (resizingTarget.value === "tree") {
    const newWidth = e.clientX - containerRect.left;
    // Constraint: 150px min, don't overlap with middle/chat (leave at least 300px for middle)
    const maxTreeWidth = containerRect.width - chatPaneWidth.value - 300;
    if (newWidth >= 150 && newWidth <= Math.max(150, maxTreeWidth)) {
      treePaneWidth.value = newWidth;
    }
  } else if (resizingTarget.value === "chat") {
    const newWidth = containerRect.right - e.clientX;
    // Constraint: 200px min, don't overlap with tree/middle (leave at least 300px for middle)
    const maxChatWidth = containerRect.width - treePaneWidth.value - 300;
    if (newWidth >= 200 && newWidth <= Math.max(200, maxChatWidth)) {
      chatPaneWidth.value = newWidth;
    }
  }
};

const stopResize = () => {
  resizingTarget.value = null;
  document.removeEventListener("mousemove", handleResize);
  document.removeEventListener("mouseup", stopResize);
  document.body.style.userSelect = "";
  document.body.style.cursor = "";
};

const handleNodeSelection = (node) => {
  if (node.id === "meta-plan") {
    if (contentRef.value) {
      contentRef.value.setTab("plan");
    }
  } else {
    activeHypothesisId.value = node.id;
  }
};

onMounted(() => {
  if (containerRef.value) {
    chatPaneWidth.value = Math.floor(containerRef.value.clientWidth * 0.35);
  }
});

onUnmounted(() => {
  stopResize();
});
</script>

<style scoped>
.investigation-workspace {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.is-resizing {
  cursor: col-resize !important;
}

.is-resizing .pane {
  pointer-events: none !important;
}

.pane {
  height: 100%;
  overflow: hidden;
  flex-shrink: 0;
}

.middle-pane {
  flex-grow: 1;
  flex-shrink: 1;
  min-width: 0;
}

.resizer {
  width: 12px;
  cursor: col-resize;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: transparent;
  position: relative;
  z-index: 10;
  margin-left: -6px;
  margin-right: -6px;
  flex-shrink: 0;
}

.resizer:hover .resizer-line,
.resizer:active .resizer-line,
.resizer.is-active .resizer-line {
  background-color: rgba(var(--v-theme-primary), 0.8);
  width: 2px;
}

.light-theme-resizer:hover .resizer-line,
.light-theme-resizer:active .resizer-line {
  background-color: rgba(0, 0, 0, 0.4) !important;
}

.resizer-line {
  width: 1px;
  height: 100%;
  background-color: rgb(var(--v-theme-custom-border-color));
  transition: background-color 0.1s;
}

.resizer-handle {
  position: absolute;
  left: 50%;
  width: 6px;
  height: 32px;
  background-color: rgb(var(--v-theme-primary));
  border-radius: 4px;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 2;
}

.light-theme-resizer .resizer-handle {
  background-color: #333;
}
</style>
