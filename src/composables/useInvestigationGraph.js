/**
 * Composable for mapping investigation session data to a DAG structure.
 */
import { computed } from "vue";
import { Graph } from "@/utils/investigationGraphUtils";

export function useInvestigationGraph(sessionData) {
  const tree = computed(() => {
    const data = sessionData.value || {};
    const graph = new Graph();
    
    // Add Meta Nodes (Plan, Conclusion) - These are always roots
    if (data.id) {
        // We can treat the investigation itself as a root container if needed,
        // but for the visual tree, we likely want flat roots for questions.
    }

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
      // Treat null hypothesis as just another hypothesis
      graph.addNode(h.id, { ...h, type: "HYPOTHESIS", label: h.hypothesis });
      
      if (h.lead_id) {
        graph.addEdge(h.lead_id, h.id);
      } else if (h.question_id) {
        // Orphan hypothesis (directly under question)
        graph.addEdge(h.question_id, h.id);
      }
      // If neither, it stays as a root (detached)
    });

    // 4. Add Tasks (Children of Hypotheses)
    (data.tasks || []).forEach((t) => {
      graph.addNode(t.id, { ...t, type: "TASK", label: t.task });
      if (t.hypothesis_id) {
        graph.addEdge(t.hypothesis_id, t.id);
      }
    });

    // Return the forest (array of trees)
    // We filter to ensure we get the expected roots (mostly Questions)
    // plus any detached items.
    const rawTree = graph.toTree();
    
    // Optional: Sort or Filter roots if necessary
    // E.g. We might want to ensure Questions come first.
    return rawTree;
  });

  return { tree };
}
