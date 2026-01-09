/*
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
*/

import { ref, computed, watch, onBeforeUnmount } from "vue";
import { useWorkflowStore } from "@/stores/workflow";

/**
 * Composable to handle automatic polling of workflow data.
 * 
 * @param {Object} options
 * @param {Ref} options.folderId - Reactive ref to current folder ID.
 * @param {Ref} options.workflowId - Reactive ref to current workflow ID.
 * @param {Ref} options.isActive - Reactive ref (usually store getter) to check if polling should be active.
 * @param {number} options.interval - Polling interval in ms (default 3000).
 */
export function useWorkflowPolling({
  folderId,
  workflowId,
  isActive,
  onUpdate,
  interval = 3000,
}) {
  const workflowStore = useWorkflowStore();
  const pollingInterval = ref(null);

  const startPolling = () => {
    if (pollingInterval.value) return;
    
    pollingInterval.value = setInterval(async () => {
      if (folderId.value && workflowId.value) {
        await workflowStore.loadWorkflowData(folderId.value, workflowId.value, true);
        if (onUpdate) onUpdate();
      }
    }, interval);
  };

  const stopPolling = () => {
    if (pollingInterval.value) {
      clearInterval(pollingInterval.value);
      pollingInterval.value = null;
    }
  };

  // Watch for activity changes
  watch(
    isActive,
    (active) => {
      if (active) {
        startPolling();
      } else {
        stopPolling();
      }
    },
    { immediate: true }
  );

  onBeforeUnmount(() => {
    stopPolling();
  });

  return {
    startPolling,
    stopPolling,
    isPolling: computed(() => !!pollingInterval.value),
  };
}
