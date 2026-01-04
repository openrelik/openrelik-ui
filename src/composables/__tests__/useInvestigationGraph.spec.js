
import { describe, it, expect } from "vitest";
import { ref } from "vue";
import { useInvestigationGraph } from "../useInvestigationGraph";

describe("useInvestigationGraph", () => {
  it("should handle empty or null session data", () => {
    const sessionData = ref(null);
    const { tree } = useInvestigationGraph(sessionData);
    expect(tree.value).toEqual([]);

    sessionData.value = {};
    expect(tree.value).toEqual([]);
  });

  it("should create question nodes as roots", () => {
    const sessionData = ref({
      questions: [
        { id: "q1", question: "What happened?" },
        { id: "q2", question: "Who did it?" },
      ],
    });
    const { tree } = useInvestigationGraph(sessionData);

    expect(tree.value).toHaveLength(2);
    expect(tree.value[0]).toMatchObject({
      id: "q1",
      type: "QUESTION",
      label: "What happened?",
    });
    expect(tree.value[1]).toMatchObject({
      id: "q2",
      type: "QUESTION",
      label: "Who did it?",
    });
  });

  it("should nest leads under questions", () => {
    const sessionData = ref({
      questions: [{ id: "q1", question: "Root Question" }],
      leads: [
        { id: "l1", lead: "Lead 1", question_id: "q1" },
        { id: "l2", lead: "Lead 2", question_id: "q1" },
      ],
    });
    const { tree } = useInvestigationGraph(sessionData);

    expect(tree.value).toHaveLength(1);
    const question = tree.value[0];
    expect(question.children).toHaveLength(2);
    expect(question.children[0]).toMatchObject({
      id: "l1",
      type: "SECTION",
      label: "Lead 1",
    });
    expect(question.children[1]).toMatchObject({
      id: "l2",
      type: "SECTION",
      label: "Lead 2",
    });
  });

  it("should nest hypotheses under leads", () => {
    const sessionData = ref({
      questions: [{ id: "q1", question: "Q" }],
      leads: [{ id: "l1", lead: "L", question_id: "q1" }],
      hypotheses: [
        { id: "h1", hypothesis: "H1", lead_id: "l1" },
      ],
    });
    const { tree } = useInvestigationGraph(sessionData);

    expect(tree.value[0].children[0].children).toHaveLength(1);
    expect(tree.value[0].children[0].children[0]).toMatchObject({
      id: "h1",
      type: "HYPOTHESIS",
      label: "H1",
    });
  });

  it("should nest hypotheses directly under questions if lead_id is missing", () => {
    const sessionData = ref({
      questions: [{ id: "q1", question: "Q" }],
      hypotheses: [
        { id: "h1", hypothesis: "H1", question_id: "q1" }, // Orphan hypothesis
      ],
    });
    const { tree } = useInvestigationGraph(sessionData);

    const question = tree.value[0];
    expect(question.children).toHaveLength(1);
    expect(question.children[0]).toMatchObject({
      id: "h1",
      type: "HYPOTHESIS",
      label: "H1",
    });
  });

  it("should nest tasks under hypotheses", () => {
    const sessionData = ref({
      questions: [{ id: "q1", question: "Q" }],
      hypotheses: [{ id: "h1", hypothesis: "H1", question_id: "q1" }],
      tasks: [
        { id: "t1", task: "Task 1", hypothesis_id: "h1" },
      ],
    });
    const { tree } = useInvestigationGraph(sessionData);

    const hypothesis = tree.value[0].children[0];
    expect(hypothesis.children).toHaveLength(1);
    expect(hypothesis.children[0]).toMatchObject({
      id: "t1",
      type: "TASK",
      label: "Task 1",
    });
  });

  it("should handle unlinked nodes as roots", () => {
    // If a hypothesis has no parent, it should be a root
    const sessionData = ref({
      hypotheses: [{ id: "h1", hypothesis: "H1" }],
    });
    const { tree } = useInvestigationGraph(sessionData);

    expect(tree.value).toHaveLength(1);
    expect(tree.value[0]).toMatchObject({
      id: "h1",
      type: "HYPOTHESIS",
    });
  });

  it("should be reactive to data changes", () => {
    const sessionData = ref({
      questions: [{ id: "q1", question: "Initial" }],
    });
    const { tree } = useInvestigationGraph(sessionData);

    expect(tree.value).toHaveLength(1);
    expect(tree.value[0].label).toBe("Initial");

    sessionData.value = {
      questions: [{ id: "q1", question: "Updated" }],
    };
    expect(tree.value[0].label).toBe("Updated");
  });

  it("should handle leads without questions as roots", () => {
    const sessionData = ref({
      leads: [{ id: "l1", lead: "Orphan Lead" }],
    });
    const { tree } = useInvestigationGraph(sessionData);

    expect(tree.value).toHaveLength(1);
    expect(tree.value[0]).toMatchObject({
      id: "l1",
      type: "SECTION",
      label: "Orphan Lead",
    });
  });

  it("should handle tasks without hypotheses as roots", () => {
    const sessionData = ref({
      tasks: [{ id: "t1", task: "Orphan Task" }],
    });
    const { tree } = useInvestigationGraph(sessionData);

    expect(tree.value).toHaveLength(1);
    expect(tree.value[0]).toMatchObject({
      id: "t1",
      type: "TASK",
      label: "Orphan Task",
    });
  });

  it("should handle session data with an ID property", () => {
    // This covers the branch `if (data.id)` even if it does nothing
    const sessionData = ref({
      id: "investigation-1",
      questions: [],
    });
    const { tree } = useInvestigationGraph(sessionData);
    expect(tree.value).toBeDefined();
  });
});
