import { mount } from "@vue/test-utils";
import InvestigationTreeNode from "../InvestigationTreeNode.vue";
import { describe, it, expect } from "vitest";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";

const vuetify = createVuetify({
  components,
  directives,
});

describe("InvestigationTreeNode", () => {
  it("renders direct hypotheses children for QUESTION nodes", async () => {
    const hypothesisNode = {
      type: "HYPOTHESIS",
      id: "h1",
      label: "Because",
      question_id: "q1",
    };

    const questionNode = {
      type: "QUESTION",
      id: "q1",
      label: "Why?",
      children: [hypothesisNode],
    };

    const wrapper = mount(InvestigationTreeNode, {
      global: {
        plugins: [vuetify],
      },
      props: {
        node: questionNode,
        depth: 0,
      },
    });

    // Initial state: not expanded
    expect(wrapper.text()).toContain("Why?");
    expect(wrapper.text()).not.toContain("Because");

    // Click to expand
    const toggleIcon = wrapper.find(".toggle-icon");
    // Should exist because we have children
    expect(toggleIcon.exists()).toBe(true);

    await toggleIcon.trigger("click");

    // Now it should be expanded and show the hypothesis
    expect(wrapper.text()).toContain("Because");
  });
});
