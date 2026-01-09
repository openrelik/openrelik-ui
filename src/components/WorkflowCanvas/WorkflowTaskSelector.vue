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
    class="task-selector glass"
    :class="{ 'light-theme': isLightTheme, 'dark-theme': !isLightTheme }"
    :style="style"
    @click.stop
    @mousedown.stop
  >
    <div class="search-bar">
      <input
        v-model="searchQuery"
        ref="searchInput"
        type="text"
        placeholder="Search tasks..."
        autofocus
        @keydown="handleInputKeydown"
      />
    </div>
    <div class="task-list">
      <div
        v-for="(task, index) in filteredTasks"
        :key="task.task_name"
        class="task-item"
        :class="{ selected: index === selectedIndex }"
        :ref="setItemRef"
        @click="selectTask(task)"
      >
        <div class="task-name">{{ task.display_name }}</div>
        <div class="task-desc">{{ task.description }}</div>
      </div>
      <div v-if="filteredTasks.length === 0" class="no-results">
        No tasks found
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  onBeforeUpdate,
  nextTick,
} from "vue";
import { useThemeInfo } from "@/composables/useThemeInfo";

// Setup
// Use theme composable
const { isLightTheme } = useThemeInfo();

const props = defineProps({
  tasks: {
    type: Array,
    default: () => [],
  },
  x: {
    type: Number,
    required: true,
  },
  y: {
    type: Number,
    required: true,
  },
  // Prop passed by parent (legacy support), but we use composable internally
  isLightTheme: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["select", "close"]);

// State
const searchQuery = ref("");
const selectedIndex = ref(0);
const itemRefs = ref([]);
const searchInput = ref(null);

// Computed
const normalizedTasks = computed(() => {
  // Normalize tasks from Pinia/Reactive objects or raw arrays.
  // Use map to create a new array to avoid mutating props
  const tasks = props.tasks.map((t) => {
    if (t._custom && t._custom.value) {
      return t._custom.value;
    }
    return t;
  });

  return tasks.sort((a, b) => {
    const nameA = (a.display_name || a.task_name || "").toLowerCase();
    const nameB = (b.display_name || b.task_name || "").toLowerCase();
    return nameA.localeCompare(nameB);
  });
});

const filteredTasks = computed(() => {
  if (!searchQuery.value) return normalizedTasks.value;
  const q = searchQuery.value.toLowerCase();
  return normalizedTasks.value.filter(
    (t) =>
      (t.display_name && t.display_name.toLowerCase().includes(q)) ||
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.task_name && t.task_name.toLowerCase().includes(q))
  );
});

const style = computed(() => {
  return {
    left: `${props.x}px`,
    top: `${props.y}px`,
  };
});

// Watch
watch(filteredTasks, () => {
  selectedIndex.value = 0;
});

watch(selectedIndex, () => {
  scrollToSelected();
});

// Lifecycle
onBeforeUpdate(() => {
  itemRefs.value = [];
});

onMounted(() => {
  nextTick(() => {
    if (searchInput.value) {
      searchInput.value.focus();
    }
  });
  window.addEventListener("keydown", handleGlobalKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleGlobalKeydown);
});

// Methods
const selectTask = (task) => {
  emit("select", task);
};

const setItemRef = (el) => {
  if (el) itemRefs.value.push(el);
};

const handleGlobalKeydown = (e) => {
  if (e.key === "Escape") {
    e.preventDefault();
    emit("close");
  }
};

const handleInputKeydown = (e) => {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (selectedIndex.value < filteredTasks.value.length - 1) {
      selectedIndex.value++;
    }
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (selectedIndex.value > 0) {
      selectedIndex.value--;
    }
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (filteredTasks.value[selectedIndex.value]) {
      selectTask(filteredTasks.value[selectedIndex.value]);
    }
  }
};

const scrollToSelected = () => {
  nextTick(() => {
    const el = itemRefs.value[selectedIndex.value];
    if (el) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  });
};
</script>

<style scoped>
.task-selector {
  position: absolute;
  width: 400px;
  max-height: 400px;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  overflow: hidden;
  z-index: 3000;
  color: var(--input-text-color, #333);
}

.search-bar {
  padding: 12px;
  border-bottom: 1px solid var(--node-border, rgba(0, 0, 0, 0.1));
}

.search-bar input {
  width: 100%;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--node-border, rgba(0, 0, 0, 0.1));
  background: rgba(148, 163, 184, 0.1);
  font-size: 0.9rem;
  outline: none;
  color: inherit;
}

.search-bar input:focus {
  border-color: var(--accent-color, #57bde8);
}

.task-list {
  overflow-y: auto;
  flex: 1;
}

.task-item {
  padding: 10px 12px;
  cursor: pointer;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  transition: background 0.1s;
  text-align: left !important;
}

.task-item:last-child {
  border-bottom: none;
}

.task-item:hover,
.task-item.selected {
  background: rgba(var(--accent-rgb), 0.1);
}

.task-name {
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 2px;
}

.task-desc {
  font-size: 0.75rem;
  color: #94a3b8;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.no-results {
  padding: 20px;
  text-align: center;
  color: #94a3b8;
  font-size: 0.9rem;
}

.glass {
  background: var(--node-bg, rgba(255, 255, 255, 0.9));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--node-border, #ccc);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1),
    0 8px 10px -6px rgba(0, 0, 0, 0.1);
}

.task-selector.dark-theme {
  color: #fff;
  --node-bg: rgba(30, 41, 59, 0.9);
  --node-border: rgba(255, 255, 255, 0.1);
  --input-text-color: #fff;
  --accent-rgb: 87, 189, 232;
}

.task-selector.light-theme,
.task-selector {
  --accent-rgb: 122, 128, 136;
}

.task-selector.dark-theme .search-bar input {
  background: rgba(0, 0, 0, 0.2);
  color: white;
}
.task-selector.dark-theme .search-bar input:focus {
  background: rgba(0, 0, 0, 0.4);
}
</style>
